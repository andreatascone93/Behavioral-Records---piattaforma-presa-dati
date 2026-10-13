/*
 * Archivio locale del prototipo. Tutto vive nel browser (localStorage):
 * desktop e mobile aperti nello stesso browser condividono gli stessi dati,
 * e la sincronizzazione con il "server" è simulata marcando gli eventi.
 */
(function (root) {
  'use strict';

  var M = root.BR.modello;
  var CHIAVE = 'behavioral-records-prototipo-v1';
  var memoria = null; // copia di riserva se localStorage non è disponibile

  function leggi() {
    try {
      var raw = root.localStorage.getItem(CHIAVE);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* storage bloccato o dati corrotti */ }
    return memoria;
  }

  function salva(stato) {
    memoria = stato;
    try { root.localStorage.setItem(CHIAVE, JSON.stringify(stato)); } catch (e) { /* resta in memoria */ }
  }

  function carica() {
    var s = leggi();
    if (!s || s.versione !== 1) {
      s = root.BR.datiFinti.genera();
      salva(s);
    }
    return s;
  }

  function ripristina() {
    var s = root.BR.datiFinti.genera();
    salva(s);
    return s;
  }

  // Avvisa quando un'altra scheda (es. il prototipo mobile) cambia i dati.
  function ascolta(cb) {
    root.addEventListener('storage', function (e) {
      if (e.key === CHIAVE) cb(leggi());
    });
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

  function faseAllaData(programma, ms) {
    var giorno = new Date(ms);
    var iso = root.BR.datiFinti.dataISO(giorno);
    var fase = programma.fasi[0];
    programma.fasi.forEach(function (f) { if (f.inizio <= iso) fase = f; });
    return fase ? fase.tipo : 'baseline';
  }

  function faseDiSessione(programma, sessione) {
    return (sessione.fasi && sessione.fasi[programma.id]) || faseAllaData(programma, sessione.inizio);
  }

  function faseCorrente(programma) {
    return programma.fasi.length ? programma.fasi[programma.fasi.length - 1].tipo : 'baseline';
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
      out.push({ sessione: s, valore: r.valore, dettagli: r.dettagli, fase: faseDiSessione(programma, s) });
    });
    return out;
  }

  function metodoUsato(metodo, versione) {
    if (!versione || versione === metodo.versione) return metodo;
    var vecchio = (metodo.storico || []).find(function (v) { return v.versione === versione; });
    return vecchio ? { id: metodo.id, tipo: vecchio.tipo, versione: vecchio.versione, parametri: vecchio.parametri, criterio: metodo.criterio } : metodo;
  }

  function statoCriterio(programma, target, punti) {
    var fase = faseCorrente(programma);
    var valori = punti.filter(function (p) { return p.fase === fase; }).map(function (p) { return p.valore; });
    var c = M.verificaCriterio(target.metodo.criterio, valori);
    if (c) c.fase = fase;
    return c;
  }

  // ---- Rete e sincronizzazione simulata ------------------------------------

  function online(stato) {
    var reale = typeof root.navigator === 'undefined' || root.navigator.onLine !== false;
    return reale && !stato.rete.simulaOffline;
  }

  function inAttesa(stato) {
    return stato.eventi.filter(function (e) { return !e.sincronizzato; }).length;
  }

  // Invia gli eventi non confermati. Il server li accetta una sola volta per
  // id, quindi rimandarli è innocuo. Le sessioni chiuse diventano visibili al
  // desktop quando tutti i loro eventi sono arrivati.
  function sincronizza(stato) {
    if (!online(stato)) return 0;
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
      fasi: {}, versioniMetodi: {}, nota: ''
    };
    sog.programmi.forEach(function (pr) {
      s.fasi[pr.id] = faseCorrente(pr);
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
  function annullaUltimo(stato, sessione, target, tipi) {
    var validi = M.eventiValidi(eventiDi(stato, sessione.id, target.id))
      .filter(function (e) { return !tipi || tipi.indexOf(e.tipo) !== -1; });
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
    carica: carica, salva: salva, ripristina: ripristina, ascolta: ascolta,
    soggetto: soggetto, operatore: operatore, targetDi: targetDi, trovaTarget: trovaTarget,
    faseDiSessione: faseDiSessione, faseCorrente: faseCorrente,
    sessioniDi: sessioniDi, eventiDi: eventiDi, serie: serie, statoCriterio: statoCriterio,
    online: online, inAttesa: inAttesa, sincronizza: sincronizza,
    apriSessione: apriSessione, registra: registra, annullaUltimo: annullaUltimo, chiudiSessione: chiudiSessione
  };
  root.BR.archivio = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
