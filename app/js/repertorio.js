/*
 * Elementi dei target e repertorio del soggetto.
 *
 * Un target DTT può insegnare un elenco di risposte (es. 25 tact): ogni
 * risposta è un elemento con il suo stato (in coda, in insegnamento,
 * acquisita). Il repertorio del soggetto raccoglie le risposte già presenti
 * prima del programma e quelle acquisite nei target, per operante e
 * categoria. Serve per gli obiettivi numerici (quante risposte acquisite) e
 * per alternare, sul telefono, richieste facili su risposte acquisite e
 * prove di training (Neef, Iwata & Page, 1980).
 *
 * target.elementi = {
 *   attivo, operante, obiettivo (numero o null), conta: 'repertorio' | 'target',
 *   inContemporanea, alternanza: { attiva, ogni },
 *   voci: [{ id, testo, categoria, stato: 'coda' | 'insegnamento' | 'acquisito', inizio, acquisito }]
 * }
 * soggetto.repertorio = [{ id, testo, operante, categoria, data, nota }]
 */
(function (root) {
  'use strict';

  var M = root.BR && root.BR.modello ? root.BR.modello : require('./modello.js');

  var OPERANTI = {
    mand: { nome: 'Mand', descrizione: 'richieste' },
    tact: { nome: 'Tact', descrizione: 'denominazioni' },
    ecoico: { nome: 'Ecoico', descrizione: 'ripetizioni vocali' },
    intraverbale: { nome: 'Intraverbale', descrizione: 'risposte verbali a stimoli verbali, es. completamenti' },
    ascoltatore: { nome: 'Ascoltatore', descrizione: 'risposte di ascoltatore, es. “dammi”, “tocca”' },
    lrffc: { nome: 'LRFFC', descrizione: 'ascoltatore per funzione, caratteristica e classe' },
    imitazione: { nome: 'Imitazione', descrizione: 'imitazione motoria' },
    abbinamento: { nome: 'Abbinamento', descrizione: 'percezione visiva e abbinamento (VP-MTS)' },
    testuale: { nome: 'Testuale', descrizione: 'lettura' },
    altro: { nome: 'Altro', descrizione: 'altre risposte' }
  };

  var STATI = {
    coda: 'In coda',
    insegnamento: 'In insegnamento',
    acquisito: 'Acquisita'
  };

  var CRITERIO_ELEMENTO = { soglia: 90, verso: 'almeno', sessioni: 3 };

  function chiave(testo) { return String(testo || '').trim().toLowerCase(); }

  function oggiISO() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  // Elementi di un target, se il target ne usa.
  function elementi(target) {
    var e = target && target.elementi;
    return e && e.attivo !== false && target.metodo && target.metodo.tipo === 'dtt' ? e : null;
  }

  function nuoviElementi(operante) {
    return { attivo: true, operante: operante || 'tact', obiettivo: null, conta: 'repertorio', inContemporanea: 3, alternanza: { attiva: true, ogni: 1 }, voci: [] };
  }

  // Righe "categoria: risposta" oppure solo "risposta"; i doppioni si saltano.
  function leggiRighe(testo, categoriaPredefinita) {
    var visti = {};
    var out = [];
    String(testo || '').split('\n').forEach(function (riga) {
      var r = riga.trim();
      if (!r) return;
      var categoria = categoriaPredefinita || '';
      var i = r.indexOf(':');
      if (i > 0) { categoria = r.slice(0, i).trim(); r = r.slice(i + 1).trim(); }
      // Una risposta per riga: le virgole restano, servono per esempio nei
      // completamenti intraverbali (“uno, due, …”).
      if (visti[chiave(r)]) return;
      visti[chiave(r)] = true;
      out.push({ testo: r, categoria: categoria });
    });
    return out;
  }

  function aggiungiVoci(el, righe, stato) {
    var esistenti = {};
    el.voci.forEach(function (v) { esistenti[chiave(v.testo)] = true; });
    var aggiunte = [];
    righe.forEach(function (r) {
      if (esistenti[chiave(r.testo)]) return;
      esistenti[chiave(r.testo)] = true;
      var v = { id: M.nuovoId('el'), testo: r.testo, categoria: r.categoria || '', stato: stato || 'coda', inizio: null, acquisito: null };
      if (v.stato === 'insegnamento') v.inizio = oggiISO();
      if (v.stato === 'acquisito') v.acquisito = oggiISO();
      el.voci.push(v);
      aggiunte.push(v);
    });
    return aggiunte;
  }

  function inInsegnamento(el) { return el ? el.voci.filter(function (v) { return v.stato === 'insegnamento'; }) : []; }
  function inCoda(el) { return el ? el.voci.filter(function (v) { return v.stato === 'coda'; }) : []; }

  // Porta in insegnamento le prime risposte in coda fino al numero previsto.
  function promuovi(el, data) {
    var posti = Math.max((+el.inContemporanea || 1) - inInsegnamento(el).length, 0);
    var promosse = inCoda(el).slice(0, posti);
    promosse.forEach(function (v) { v.stato = 'insegnamento'; v.inizio = data || oggiISO(); });
    return promosse;
  }

  function segnaAcquisito(el, voceId, data) {
    var v = el.voci.find(function (x) { return x.id === voceId; });
    if (!v) return null;
    v.stato = 'acquisito';
    v.acquisito = data || oggiISO();
    return { voce: v, promosse: promuovi(el, data) };
  }

  // Repertorio del soggetto: risposte già presenti più quelle acquisite nei
  // target. Una risposta compare una volta sola per operante.
  function repertorio(sog) {
    var out = [];
    var visti = {};
    function metti(x) {
      var k = x.operante + '|' + chiave(x.testo);
      if (visti[k]) return;
      visti[k] = true;
      out.push(x);
    }
    (sog.repertorio || []).forEach(function (r) {
      metti({ id: r.id, testo: r.testo, operante: r.operante || 'altro', categoria: r.categoria || '', fonte: 'presente', data: r.data || null, nota: r.nota || '' });
    });
    (sog.programmi || []).forEach(function (pr) {
      pr.target.forEach(function (t) {
        var el = elementi(t);
        if (!el) return;
        el.voci.forEach(function (v) {
          if (v.stato !== 'acquisito') return;
          metti({ id: v.id, testo: v.testo, operante: el.operante || 'altro', categoria: v.categoria || '', fonte: 'acquisito', data: v.acquisito, targetId: t.id, targetNome: t.nome });
        });
      });
    });
    return out;
  }

  // { operante: { categoria: [risposte] } }, nell'ordine di OPERANTI.
  function perOperante(rep) {
    var out = {};
    Object.keys(OPERANTI).forEach(function (op) {
      var voci = rep.filter(function (x) { return x.operante === op; });
      if (!voci.length) return;
      out[op] = {};
      voci.forEach(function (x) {
        var c = x.categoria || 'Senza categoria';
        (out[op][c] = out[op][c] || []).push(x);
      });
    });
    return out;
  }

  // Avanzamento verso l'obiettivo numerico del target.
  function progresso(sog, target) {
    var el = elementi(target);
    if (!el) return null;
    var delTarget = el.voci.filter(function (v) { return v.stato === 'acquisito'; }).length;
    var acquisiti = el.conta === 'target'
      ? delTarget
      : repertorio(sog).filter(function (x) { return x.operante === el.operante; }).length;
    var obiettivo = +el.obiettivo || null;
    return {
      acquisiti: acquisiti, delTarget: delTarget, obiettivo: obiettivo,
      percentuale: obiettivo ? Math.min(acquisiti / obiettivo, 1) * 100 : null,
      raggiunto: !!obiettivo && acquisiti >= obiettivo,
      inInsegnamento: inInsegnamento(el).length, inCoda: inCoda(el).length,
      operante: el.operante
    };
  }

  function descriviProgresso(p) {
    if (!p) return '';
    var nome = (OPERANTI[p.operante] || OPERANTI.altro).nome.toLowerCase();
    var testo = p.obiettivo ? p.acquisiti + ' di ' + p.obiettivo + ' ' + nome + ' acquisiti' : p.acquisiti + ' ' + nome + ' acquisiti';
    return testo + ' · ' + p.inInsegnamento + ' in insegnamento' + (p.inCoda ? ', ' + p.inCoda + ' in coda' : '');
  }

  // Giorno di calendario (ora locale) di un istante.
  function giorno(ms) {
    var d = new Date(ms);
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  /*
   * Stato di ogni risposta in insegnamento rispetto al criterio del target
   * (o, senza criterio, 90% per 3 sessioni), calcolato sulle sole prove di
   * quella risposta, dalle sessioni da quando è in insegnamento.
   * punti: archivio.serie del target. Restituisce [{ voce, sessioni, ultimo,
   * criterio, pronto }].
   */
  function statoElementi(target, punti, criterio) {
    var el = elementi(target);
    if (!el) return [];
    var crit = criterio || CRITERIO_ELEMENTO;
    // Criterio sui soli probe: le prove per risposta si leggono nei probe.
    if (crit.contesto && root.BR.seduta) {
      punti = root.BR.seduta.serieNelContesto(punti, crit.contesto);
      crit = Object.assign({}, crit, { contesto: null });
    }
    return inInsegnamento(el).map(function (v) {
      var dal = v.inizio ? new Date(v.inizio + 'T00:00:00').getTime() : 0;
      var suoi = punti.filter(function (p) {
        return p.sessione.inizio >= dal && p.dettagli && p.dettagli.perElemento && p.dettagli.perElemento[v.id];
      });
      if (crit.primaProva) {
        var visti = {};
        suoi = suoi.filter(function (p) { var g = giorno(p.sessione.inizio); if (visti[g]) return false; visti[g] = true; return true; });
      }
      var valori = suoi.map(function (p) {
        var d = p.dettagli.perElemento[v.id];
        var punto = { valore: d.prove ? (d.distribuzione.I / d.prove) * 100 : null, dettagli: d };
        return { valore: M.valoreCriterio(crit, 'dtt', punto), operatore: p.sessione.operatoreId, setting: p.sessione.setting };
      });
      var c = M.verificaCriterio(crit, valori);
      return { voce: v, sessioni: suoi.length, ultimo: valori.length ? valori[valori.length - 1].valore : null, criterio: c, pronto: !!(c && c.raggiunto) };
    });
  }

  // Errori sulle richieste facili nelle ultime sessioni: risposte acquisite
  // da ripassare. { idRisposta: errori }.
  function erroriMantenimento(punti, ultime) {
    var out = {};
    punti.slice(-(ultime || 5)).forEach(function (p) {
      var m = p.dettagli && p.dettagli.mantenimento;
      if (!m) return;
      Object.keys(m.errori || {}).forEach(function (k) { out[k] = (out[k] || 0) + m.errori[k]; });
    });
    return out;
  }

  // Risposte acquisite da usare come richieste facili: prima quelle dello
  // stesso operante del target, altrimenti tutte.
  function richiesteFacili(sog, target) {
    var el = elementi(target);
    var rep = repertorio(sog);
    var stesso = el ? rep.filter(function (x) { return x.operante === el.operante; }) : [];
    return stesso.length ? stesso : rep;
  }

  /*
   * Prossima prova da presentare in seduta, dalle prove già registrate
   * (eventi validi del target nella sessione). Con l'alternanza attiva, dopo
   * `ogni` prove di training arriva una richiesta facile su una risposta
   * acquisita. Le risposte si ruotano: prima quella presentata meno volte,
   * evitando di ripetere la stessa due volte di fila.
   * Restituisce { tipo: 'training' | 'mantenimento', elemento } oppure null.
   */
  function prossimaProva(sog, target, eventi) {
    var el = elementi(target);
    if (!el) return null;
    var prove = eventi.filter(function (e) { return e.tipo === 'prova'; });
    var training = inInsegnamento(el);
    var facili = richiesteFacili(sog, target);
    var alt = el.alternanza || {};
    var ogni = Math.max(+alt.ogni || 1, 1);
    var dopoUltimaFacile = 0;
    for (var i = prove.length - 1; i >= 0 && !prove[i].valore.mantenimento; i--) dopoUltimaFacile++;
    var ultimo = prove.length ? prove[prove.length - 1].valore.elemento : null;

    function scegli(lista, soloMantenimento) {
      var usi = {};
      prove.forEach(function (e) {
        if (!!e.valore.mantenimento === soloMantenimento && e.valore.elemento) usi[e.valore.elemento] = (usi[e.valore.elemento] || 0) + 1;
      });
      var candidati = lista.length > 1 ? lista.filter(function (x) { return x.id !== ultimo; }) : lista;
      var min = Math.min.apply(null, candidati.map(function (x) { return usi[x.id] || 0; }));
      var pari = candidati.filter(function (x) { return (usi[x.id] || 0) === min; });
      // Tra le pari, si scorre la lista così le richieste facili variano.
      return pari[prove.length % pari.length];
    }

    var vuoleFacile = alt.attiva && facili.length && (dopoUltimaFacile >= ogni || !training.length);
    if (vuoleFacile) return { tipo: 'mantenimento', elemento: scegli(facili, true) };
    if (training.length) return { tipo: 'training', elemento: scegli(training, false) };
    return null;
  }

  var api = {
    OPERANTI: OPERANTI, STATI: STATI, CRITERIO_ELEMENTO: CRITERIO_ELEMENTO,
    elementi: elementi, nuoviElementi: nuoviElementi, leggiRighe: leggiRighe, aggiungiVoci: aggiungiVoci,
    inInsegnamento: inInsegnamento, inCoda: inCoda, promuovi: promuovi, segnaAcquisito: segnaAcquisito,
    repertorio: repertorio, perOperante: perOperante, progresso: progresso, descriviProgresso: descriviProgresso,
    statoElementi: statoElementi, erroriMantenimento: erroriMantenimento,
    richiesteFacili: richiesteFacili, prossimaProva: prossimaProva
  };
  root.BR = root.BR || {};
  root.BR.repertorio = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
