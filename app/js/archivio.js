/*
 * Archivio dei dati sul dispositivo. Nel browser vive in IndexedDB (vedi
 * deposito.js), con localStorage come riserva; in Node resta in memoria.
 * Senza cloud collegato la sincronizzazione è simulata come nei prototipi:
 * desktop e telefono aperti nello stesso browser condividono gli stessi dati.
 * Con il cloud collegato (cloud.js) la sincronizzazione è vera.
 */
(function (root) {
  'use strict';

  var M = root.BR.modello;
  var CHIAVE = 'behavioral-records-prototipo-v3'; // localStorage dei prototipi
  var CHIAVE_DEPOSITO = 'stato';
  var memoria = null;   // stato corrente di questa pagina
  var usaDeposito = false;
  var canale = null;
  var ascoltatori = [];

  function valido(s) { return s && s.versione === 3 ? s : null; }

  function leggiLocale() {
    try {
      var raw = root.localStorage.getItem(CHIAVE);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* storage bloccato o dati corrotti */ }
    return null;
  }

  function avvisaAltreSchede() {
    try { if (canale) canale.postMessage('stato'); } catch (e) { /* scheda chiusa */ }
  }

  function salva(stato) {
    memoria = stato;
    if (usaDeposito) {
      root.BR.deposito.scrivi(CHIAVE_DEPOSITO, stato).then(avvisaAltreSchede, function (e) {
        if (root.console) root.console.error('Salvataggio non riuscito', e);
      });
      return;
    }
    try { root.localStorage.setItem(CHIAVE, JSON.stringify(stato)); } catch (e) { /* resta in memoria */ }
  }

  // Versione sincrona, per Node e per i test: dati in memoria o di esempio.
  function carica() {
    var s = valido(memoria) || valido(typeof root.localStorage !== 'undefined' ? leggiLocale() : null);
    if (!s) {
      s = root.BR.datiFinti.genera();
      salva(s);
    }
    memoria = s;
    return s;
  }

  // Avvio nel browser: apre IndexedDB e vi porta i dati dei prototipi, se ci
  // sono. Al primo avvio assoluto crea i dati di esempio.
  function avvia() {
    var D = root.BR.deposito;
    return (D ? D.disponibile() : Promise.resolve(false)).then(function (ok) {
      usaDeposito = ok;
      if (!ok) return carica();
      return D.leggi(CHIAVE_DEPOSITO).then(function (s) {
        s = valido(s) || valido(leggiLocale()) || root.BR.datiFinti.genera();
        memoria = s;
        D.persisti();
        return D.scrivi(CHIAVE_DEPOSITO, s).then(function () {
          try { root.localStorage.removeItem(CHIAVE); } catch (e) { /* niente da togliere */ }
          return s;
        });
      });
    }).then(function (s) {
      if (typeof root.BroadcastChannel === 'function' && !canale) {
        canale = new root.BroadcastChannel('behavioral-records');
        canale.onmessage = function () { ricarica(); };
      }
      return s;
    });
  }

  function ricarica() {
    var p = usaDeposito ? root.BR.deposito.leggi(CHIAVE_DEPOSITO) : Promise.resolve(leggiLocale());
    p.then(function (s) {
      if (!valido(s)) return;
      memoria = s;
      notifica(s);
    });
  }

  function attuale() { return memoria; }

  function ripristina() {
    var s = root.BR.datiFinti.genera();
    salva(s);
    return s;
  }

  // cb(stato) quando i dati cambiano fuori da questa pagina: un'altra scheda
  // dello stesso browser oppure il cloud.
  function ascolta(cb) {
    ascoltatori.push(cb);
    if (ascoltatori.length === 1 && root.addEventListener) {
      root.addEventListener('storage', function (e) {
        if (e.key === CHIAVE && !usaDeposito) ricarica();
      });
    }
  }

  function notifica(stato) {
    memoria = stato;
    ascoltatori.forEach(function (cb) { cb(stato); });
  }

  // ---- Consultazioni ------------------------------------------------------

  function soggetto(stato, id) {
    return stato.config.soggetti.find(function (s) { return s.id === id; }) || null;
  }

  function operatore(stato, id) {
    return stato.config.operatori.find(function (o) { return o.id === id; }) || null;
  }

  // Tutti i target di un soggetto con il loro programma.
  function targetDi(sog) {
    var out = [];
    sog.programmi.forEach(function (pr) {
      pr.target.forEach(function (t) { out.push({ programma: pr, target: t }); });
    });
    return out;
  }

  function trovaTarget(sog, targetId) {
    return targetDi(sog).find(function (x) { return x.target.id === targetId; }) || null;
  }

  // Le fasi svolte sono voci { id, tipo, inizio, nota, pianoId }: due fasi
  // dello stesso tipo (es. due passi di assottigliamento) restano distinte.
  function voceAllaData(programma, ms) {
    var iso = root.BR.datiFinti.dataISO(new Date(ms));
    var fase = programma.fasi[0] || null;
    programma.fasi.forEach(function (f) { if (f.inizio <= iso) fase = f; });
    return fase;
  }

  function voceDiSessione(programma, sessione) {
    var id = sessione.fasiId && sessione.fasiId[programma.id];
    var voce = id ? programma.fasi.find(function (f) { return f.id === id; }) : null;
    return voce || voceAllaData(programma, sessione.inizio);
  }

  function voceCorrente(programma) {
    return programma.fasi.length ? programma.fasi[programma.fasi.length - 1] : null;
  }

  function faseDiSessione(programma, sessione) {
    var voce = voceDiSessione(programma, sessione);
    return voce ? voce.tipo : 'baseline';
  }

  function faseCorrente(programma) {
    var voce = voceCorrente(programma);
    return voce ? voce.tipo : 'baseline';
  }

  function nomeFaseCorrente(programma) {
    return root.BR.piano.nomeFase(programma, voceCorrente(programma));
  }

  function sessioniDi(stato, soggettoId, opzioni) {
    var o = opzioni || {};
    return stato.sessioni
      .filter(function (s) {
        if (s.soggettoId !== soggettoId) return false;
        if (o.soloChiuse && s.stato !== 'chiusa') return false;
        if (o.soloSincronizzate && !s.sincronizzata) return false;
        return true;
      })
      .sort(function (a, b) { return a.inizio - b.inizio; });
  }

  function eventiDi(stato, sessioneId, targetId) {
    return stato.eventi.filter(function (e) {
      return e.sessioneId === sessioneId && (!targetId || e.targetId === targetId);
    });
  }

  /*
   * Serie dei valori per sessione di un target.
   * opzioni.soloSincronizzate: true per il desktop (vede solo ciò che è
   * arrivato al server), false per il telefono (vede la sua copia locale).
   */
  function serie(stato, sog, programma, target, opzioni) {
    var o = opzioni || {};
    var sess = sessioniDi(stato, sog.id, { soloChiuse: true, soloSincronizzate: o.soloSincronizzate });
    var out = [];
    out.escluse = 0;
    sess.forEach(function (s) {
      var ev = eventiDi(stato, s.id, target.id);
      // Ogni sessione si calcola con la versione del metodo con cui è stata
      // registrata. Se nel frattempo è cambiato il tipo di misura, l'unità non
      // è più confrontabile e la sessione resta fuori dal grafico.
      var metodo = metodoUsato(target.metodo, s.versioniMetodi && s.versioniMetodi[target.metodo.id]);
      if (metodo.tipo !== target.metodo.tipo) { if (ev.length) out.escluse++; return; }
      // Senza eventi, un target previsto nella seduta vale 0 per i conteggi
      // (frequenza, durata, ABC); per le percentuali manca il dato.
      var previsto = s.versioniMetodi && Object.prototype.hasOwnProperty.call(s.versioniMetodi, target.metodo.id);
      if (!ev.length && !previsto) return;
      var r = M.calcola(metodo, ev, s);
      if (r.valore == null && !ev.length) return;
      var voce = voceDiSessione(programma, s);
      out.push({
        sessione: s, valore: r.valore, dettagli: r.dettagli,
        fase: voce ? voce.tipo : 'baseline', faseId: voce ? voce.id : null,
        faseNome: root.BR.piano.nomeFase(programma, voce)
      });
    });
    return out;
  }

  function metodoUsato(metodo, versione) {
    if (!versione || versione === metodo.versione) return metodo;
    var vecchio = (metodo.storico || []).find(function (v) { return v.versione === versione; });
    return vecchio ? { id: metodo.id, tipo: vecchio.tipo, versione: vecchio.versione, parametri: vecchio.parametri, criterio: metodo.criterio } : metodo;
  }

  // Criterio nella fase in corso: quello della fase pianificata, se lo
  // prevede, altrimenti il criterio di padronanza del target.
  function criterioCorrente(programma, target) {
    return root.BR.piano.criterioPerFase(target, root.BR.piano.faseInCorso(programma));
  }

  function statoCriterio(programma, target, punti) {
    var voce = voceCorrente(programma);
    var valori = punti.filter(function (p) { return voce ? p.faseId === voce.id : true; }).map(function (p) { return p.valore; });
    var c = M.verificaCriterio(criterioCorrente(programma, target), valori);
    if (c) c.fase = voce ? voce.tipo : 'baseline';
    return c;
  }

  // Regole della fase in corso di un programma (ritorno, stallo), dalle serie
  // di tutti i suoi target.
  function regoleFase(stato, sog, programma, opzioni) {
    var voce = voceCorrente(programma);
    var valori = {};
    var raggiunti = false;
    programma.target.forEach(function (t) {
      var punti = serie(stato, sog, programma, t, opzioni);
      valori[t.id] = punti.filter(function (p) { return voce && p.faseId === voce.id; }).map(function (p) { return p.valore; });
      var c = statoCriterio(programma, t, punti);
      if (c && c.raggiunto) raggiunti = true;
    });
    return root.BR.piano.valutaRegole(root.BR.piano.faseInCorso(programma), valori, raggiunti);
  }

  // ---- Rete e sincronizzazione simulata ------------------------------------

  function online(stato) {
    var reale = typeof root.navigator === 'undefined' || root.navigator.onLine !== false;
    return reale && !stato.rete.simulaOffline;
  }

  function inAttesa(stato) {
    return stato.eventi.filter(function (e) { return !e.sincronizzato; }).length;
  }

  function cloudAttivo() { return !!(root.BR.cloud && root.BR.cloud.attivo()); }

  // Con il cloud collegato avvia un ciclo vero (asincrono) e restituisce 0:
  // l'esito arriva dopo. Senza cloud, la sincronizzazione è simulata: il
  // "server" accetta gli eventi una sola volta per id, quindi rimandarli è
  // innocuo; le sessioni chiuse diventano visibili al desktop quando tutti i
  // loro eventi sono arrivati.
  function sincronizza(stato) {
    if (!online(stato)) return 0;
    if (cloudAttivo()) { root.BR.cloud.sincronizzaPresto(); return 0; }
    var inviati = 0;
    stato.eventi.forEach(function (e) {
      if (!e.sincronizzato) { e.sincronizzato = true; inviati++; }
    });
    stato.sessioni.forEach(function (s) {
      if (s.stato === 'chiusa') s.sincronizzata = true;
    });
    stato.rete.ultimaSincronizzazione = Date.now();
    return inviati;
  }

  // ---- Registrazione (telefono) --------------------------------------------

  function apriSessione(stato, sog) {
    var s = {
      id: M.nuovoId('se'), soggettoId: sog.id, scheduleId: sog.schedule.id,
      operatoreId: stato.operatoreCorrente, inizio: Date.now(), fine: null,
      stato: 'aperta', sincronizzata: false, setting: sog.schedule.setting,
      fasi: {}, fasiId: {}, versioniMetodi: {}, nota: ''
    };
    sog.programmi.forEach(function (pr) {
      var voce = voceCorrente(pr);
      s.fasi[pr.id] = voce ? voce.tipo : 'baseline';
      if (voce) s.fasiId[pr.id] = voce.id;
      pr.target.forEach(function (t) { s.versioniMetodi[t.metodo.id] = t.metodo.versione; });
    });
    stato.sessioni.push(s);
    return s;
  }

  function registra(stato, sessione, target, tipo, valore, extra) {
    var e = {
      id: M.nuovoId('ev'), sessioneId: sessione.id, targetId: target.id,
      metodoId: target.metodo.id, tipo: tipo, t: Date.now(), valore: valore,
      operatoreId: sessione.operatoreId, sincronizzato: false
    };
    if (extra) Object.keys(extra).forEach(function (k) { e[k] = extra[k]; });
    stato.eventi.push(e);
    return e;
  }

  // Annulla l'ultimo evento valido di un target nella sessione (se c'è).
  // Senza tipi, le conseguenze del piano restano fuori: si annullano a parte.
  function annullaUltimo(stato, sessione, target, tipi) {
    var validi = M.eventiValidi(eventiDi(stato, sessione.id, target.id))
      .filter(function (e) { return tipi ? tipi.indexOf(e.tipo) !== -1 : e.tipo !== 'conseguenza'; });
    var ultimo = validi[validi.length - 1];
    if (!ultimo) return null;
    return registra(stato, sessione, target, 'annulla', null, { rif: ultimo.id });
  }

  function chiudiSessione(stato, sessione) {
    sessione.fine = Date.now();
    sessione.stato = 'chiusa';
    sessione.sincronizzata = false;
  }

  var api = {
    CHIAVE: CHIAVE,
    carica: carica, avvia: avvia, salva: salva, ripristina: ripristina, ascolta: ascolta,
    notifica: notifica, attuale: attuale, cloudAttivo: cloudAttivo,
    soggetto: soggetto, operatore: operatore, targetDi: targetDi, trovaTarget: trovaTarget,
    faseDiSessione: faseDiSessione, faseCorrente: faseCorrente, voceDiSessione: voceDiSessione,
    voceCorrente: voceCorrente, nomeFaseCorrente: nomeFaseCorrente, criterioCorrente: criterioCorrente,
    sessioniDi: sessioniDi, eventiDi: eventiDi, serie: serie, statoCriterio: statoCriterio, regoleFase: regoleFase,
    online: online, inAttesa: inAttesa, sincronizza: sincronizza,
    apriSessione: apriSessione, registra: registra, annullaUltimo: annullaUltimo, chiudiSessione: chiudiSessione
  };
  root.BR.archivio = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
