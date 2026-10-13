/*
 * Organizzazione della seduta: la scaletta in blocchi (accoglienza, probe,
 * baseline, insegnamento, pause, mantenimento, probe ritardato, chiusura),
 * i target da misurare per tutta la seduta, la proposta automatica di una
 * scaletta, i controlli sui tempi e, durante la seduta, il blocco in corso.
 * Ogni evento registrato porta il blocco e il suo tipo ("contesto"), così i
 * dati dei probe restano separati da quelli raccolti durante l'insegnamento.
 * Vedi docs/organizzazione-seduta.md.
 */
(function (root) {
  'use strict';

  /*
   * Valori di partenza della proposta automatica. Sono convenzioni
   * ragionevoli e modificabili per paziente: vanno allineati alla rassegna
   * della letteratura sulla gestione della seduta quando sarà disponibile.
   */
  var PREDEFINITI = {
    accoglienzaMin: 5,        // pairing e scelta del rinforzatore
    minutiPerProbe: 1,        // per target, una prova a freddo
    proveProbe: 1,
    minutiPerBaseline: 2,     // per target in baseline
    proveBaseline: 5,
    bloccoInsegnamentoMax: 15, // oltre, una pausa
    pausaMin: 3,
    mantenimentoMin: 5,       // dalle sedute di 60 minuti in su
    ritardoProbeMin: 30,      // tra la fine dell'insegnamento e il probe ritardato
    proveProbeRitardato: 1,
    chiusuraMin: 3
  };

  /*
   * contesto: come entrano i dati raccolti nel blocco.
   *   probe: risposte senza prompt né rinforzo differenziale (valutazione)
   *   insegnamento: prove di training, con prompt e rinforzo
   *   baseline: prove senza insegnamento
   *   nessuno: nessuna prova discreta (si misurano solo i target continui)
   * prove: true se il blocco ha target con prove discrete.
   */
  var TIPI = {
    accoglienza: { nome: 'Accoglienza e pairing', breve: 'Accoglienza', contesto: 'nessuno', prove: false,
      descrizione: 'Associazione dell’operatore ai rinforzatori, scelta di cosa guadagnare.' },
    probe: { nome: 'Probe a freddo', breve: 'Probe', contesto: 'probe', prove: true,
      descrizione: 'Prima presentazione del target nella seduta, prima di insegnarlo: niente prompt, niente rinforzo differenziale.' },
    baseline: { nome: 'Baseline', breve: 'Baseline', contesto: 'baseline', prove: true,
      descrizione: 'Prove senza insegnamento per i target non ancora in trattamento.' },
    insegnamento: { nome: 'Insegnamento (DTT)', breve: 'Insegnamento', contesto: 'insegnamento', prove: true,
      descrizione: 'Prove di insegnamento con prompt e rinforzo, come da programma.' },
    net: { nome: 'Insegnamento naturale (NET)', breve: 'NET', contesto: 'insegnamento', prove: true,
      descrizione: 'Occasioni di insegnamento dentro il gioco e le routine.' },
    mantenimento: { nome: 'Mantenimento e generalizzazione', breve: 'Mantenimento', contesto: 'insegnamento', prove: true,
      descrizione: 'Richieste su risposte già acquisite, materiali e persone diversi.' },
    pausa: { nome: 'Pausa e accesso al rinforzo', breve: 'Pausa', contesto: 'nessuno', prove: false,
      descrizione: 'Accesso libero ai rinforzatori; si continuano a misurare i target di tutta la seduta.' },
    attivita: { nome: 'Attività e gioco', breve: 'Attività', contesto: 'nessuno', prove: false,
      descrizione: 'Attività strutturate o gioco, mentre si misurano i target di tutta la seduta.' },
    probe_ritardato: { nome: 'Probe ritardato', breve: 'Probe ritardato', contesto: 'probe', prove: true,
      descrizione: 'Ripresentazione dopo un intervallo dall’insegnamento, senza prompt: dice se la risposta si mantiene.' },
    chiusura: { nome: 'Chiusura', breve: 'Chiusura', contesto: 'nessuno', prove: false,
      descrizione: 'Transizione, saluto, eventuali note per la famiglia.' }
  };

  var CONTESTI = {
    probe: 'Probe',
    insegnamento: 'Insegnamento',
    baseline: 'Baseline'
  };

  // Misure a prove discrete: si presentano in un blocco. Le altre (conteggi,
  // durate, intervalli, ABC) si registrano per tutta la seduta.
  var DISCRETE = ['dtt', 'task_analysis', 'latenza'];

  function discreto(target) { return DISCRETE.indexOf(target.metodo.tipo) !== -1; }

  function nuovoId() { return root.BR.modello.nuovoId('bl'); }

  function blocco(tipo, durataMin, targetIds, extra) {
    var b = { id: nuovoId(), tipo: tipo, nome: TIPI[tipo].nome, durataMin: durataMin, targetIds: targetIds || [], prove: null, ritardoMin: null, nota: '' };
    if (extra) Object.keys(extra).forEach(function (k) { b[k] = extra[k]; });
    return b;
  }

  // Target della schedule (nell'ordine della schedule), con il programma.
  function targetDellaSchedule(sog) {
    var tutti = {};
    sog.programmi.forEach(function (pr) { pr.target.forEach(function (t) { tutti[t.id] = { programma: pr, target: t }; }); });
    return (sog.schedule.voci || []).map(function (v) { return tutti[v.targetId]; }).filter(Boolean);
  }

  function inBaseline(programma) {
    var f = programma.fasi && programma.fasi.length ? programma.fasi[programma.fasi.length - 1] : null;
    return !f || f.tipo === 'baseline';
  }

  /*
   * Proposta di scaletta per la durata della schedule. I comportamenti e le
   * misure continue vanno "per tutta la seduta"; i target a prove discrete
   * in baseline hanno un blocco di baseline; quelli in trattamento hanno
   * probe a freddo, blocchi di insegnamento intervallati da pause e, se c'è
   * tempo per il ritardo, un probe ritardato prima della chiusura.
   * Restituisce { blocchi, continui, note }.
   */
  function proponi(sog, opzioni) {
    var o = {};
    Object.keys(PREDEFINITI).forEach(function (k) { o[k] = PREDEFINITI[k]; });
    Object.keys(opzioni || {}).forEach(function (k) { o[k] = opzioni[k]; });
    var D = Math.max(5, +sog.schedule.durataMin || 30);
    var voci = targetDellaSchedule(sog);
    var continui = voci.filter(function (x) { return !discreto(x.target); }).map(function (x) { return x.target.id; });
    var base = voci.filter(function (x) { return discreto(x.target) && inBaseline(x.programma); }).map(function (x) { return x.target.id; });
    var training = voci.filter(function (x) { return discreto(x.target) && !inBaseline(x.programma); }).map(function (x) { return x.target.id; });
    var note = [];

    var testa = [], coda = [];
    var accoglienza = Math.min(o.accoglienzaMin, Math.round(D * 0.1)) || 0;
    var chiusura = Math.min(o.chiusuraMin, Math.round(D * 0.1)) || 0;
    if (accoglienza) testa.push(blocco('accoglienza', accoglienza));
    if (training.length) testa.push(blocco('probe', Math.max(2, Math.ceil(training.length * o.minutiPerProbe)), training.slice(), { prove: o.proveProbe }));
    if (base.length) testa.push(blocco('baseline', Math.max(3, base.length * o.minutiPerBaseline), base.slice(), { prove: o.proveBaseline }));
    if (chiusura) coda.push(blocco('chiusura', chiusura));

    var fisso = somma(testa) + somma(coda);
    var resto = D - fisso;
    var centro = [];
    if (training.length) {
      centro = centroConRitardato(testa, resto, training, D, o);
      if (!centro) {
        centro = centroSemplice(resto, training, D, o);
        note.push('Il probe ritardato non entra in una seduta di ' + D + ' minuti con ' + o.ritardoProbeMin + ' minuti di ritardo: fa da probe ritardato il probe a freddo della seduta successiva.');
      }
    } else if (resto > 0) {
      centro.push(blocco('attivita', resto, []));
    }
    var blocchi = testa.concat(centro, coda);
    // Se la somma non torna (sedute molto brevi), l'ultimo blocco non fisso assorbe la differenza.
    var diff = D - somma(blocchi);
    if (diff) {
      var regolabile = blocchi.slice().reverse().find(function (b) { return b.tipo === 'insegnamento' || b.tipo === 'attivita'; }) || blocchi[blocchi.length - 1];
      if (regolabile) regolabile.durataMin = Math.max(1, regolabile.durataMin + diff);
    }
    if (continui.length) note.push('Per tutta la seduta: ' + continui.length + (continui.length === 1 ? ' target misurato' : ' target misurati') + ' in continuo, in ogni blocco.');
    return { blocchi: blocchi, continui: continui, note: note };
  }

  // Insegnamento (con pause) e, dalle sedute di 60 minuti, mantenimento.
  function centroSemplice(minuti, training, D, o, riserva) {
    var mant = D >= 60 ? o.mantenimentoMin : 0;
    var perInsegnare = minuti - (riserva || 0) - mant;
    if (perInsegnare < 5) { perInsegnare += mant; mant = 0; }
    var centro = blocchiInsegnamento(perInsegnare, training, o);
    if (mant) centro.push(blocco('mantenimento', mant, training.slice()));
    return centro;
  }

  /*
   * Con il probe ritardato in fondo: una metà dei target (gruppo A) si
   * insegna solo nei blocchi che finiscono almeno ritardoProbeMin minuti
   * prima del probe; nei blocchi successivi si lavora sugli altri. Con un
   * solo target non resta niente da fare nei blocchi tardivi, quindi il
   * probe ritardato entra solo se il ritardo c'è comunque. null se non entra.
   */
  function centroConRitardato(testa, resto, training, D, o) {
    var durata = Math.max(2, Math.ceil(training.length * o.minutiPerProbe));
    if (resto - durata < 10) return null;
    var centro = centroSemplice(resto, training, D, o, durata);
    var gruppoA = training.length > 1 ? training.slice(0, Math.ceil(training.length / 2)) : training.slice();
    var inizioProbe = somma(testa) + somma(centro);
    var t = somma(testa);
    var ancora = false;
    for (var i = 0; i < centro.length; i++) {
      var b = centro[i];
      t += b.durataMin;
      if (TIPI[b.tipo].contesto !== 'insegnamento') continue;
      if (t > inizioProbe - o.ritardoProbeMin) {
        b.targetIds = b.targetIds.filter(function (id) { return gruppoA.indexOf(id) === -1; });
        if (!b.targetIds.length) return null;
      } else ancora = true;
    }
    if (!ancora) return null;
    centro.push(blocco('probe_ritardato', durata, gruppoA, { prove: o.proveProbeRitardato, ritardoMin: o.ritardoProbeMin }));
    return centro;
  }

  // Divide il tempo in blocchi di insegnamento di al massimo
  // bloccoInsegnamentoMax minuti con una pausa tra l'uno e l'altro.
  function blocchiInsegnamento(minuti, targetIds, o) {
    if (minuti <= 0) return [];
    var max = o.bloccoInsegnamentoMax, pausa = o.pausaMin;
    var k = Math.max(1, Math.ceil((minuti + pausa) / (max + pausa)));
    var perBlocco = Math.floor((minuti - (k - 1) * pausa) / k);
    while (k > 1 && perBlocco < 5) { k--; perBlocco = Math.floor((minuti - (k - 1) * pausa) / k); }
    var out = [];
    var usati = 0;
    for (var i = 0; i < k; i++) {
      var dur = i === k - 1 ? minuti - usati : perBlocco;
      out.push(blocco('insegnamento', dur, targetIds.slice(), { nome: k > 1 ? 'Insegnamento ' + (i + 1) : TIPI.insegnamento.nome }));
      usati += dur;
      if (i < k - 1) { out.push(blocco('pausa', pausa)); usati += pausa; }
    }
    return out;
  }

  function somma(blocchi) {
    return blocchi.reduce(function (a, b) { return a + (+b.durataMin || 0); }, 0);
  }

  // Inizio e fine previsti di ogni blocco, in minuti dall'inizio della seduta.
  function orari(blocchi) {
    var t = 0;
    return blocchi.map(function (b) {
      var x = { id: b.id, inizio: t, fine: t + (+b.durataMin || 0) };
      t = x.fine;
      return x;
    });
  }

  /*
   * Controlli sulla scaletta: durata totale, target a prove discrete senza
   * blocco, probe a freddo dopo l'insegnamento, probe ritardato troppo
   * vicino all'insegnamento, blocchi di insegnamento lunghi senza pause.
   * Restituisce [{ livello: 'attenzione' | 'info', testo }].
   */
  function verifica(sog) {
    var sc = sog.schedule;
    var blocchi = sc.blocchi || [];
    if (!blocchi.length) return [];
    var out = [];
    var nomi = {};
    targetDellaSchedule(sog).forEach(function (x) { nomi[x.target.id] = x.target.nome; });
    var tot = somma(blocchi);
    if (tot !== +sc.durataMin) {
      out.push({ livello: 'attenzione', testo: 'La scaletta dura ' + tot + ' minuti, la seduta ne prevede ' + sc.durataMin + '.' });
    }
    var orario = orari(blocchi);
    var fineInsegnamento = {}, inizioInsegnamento = {};
    blocchi.forEach(function (b, i) {
      if (TIPI[b.tipo] && TIPI[b.tipo].contesto === 'insegnamento') {
        b.targetIds.forEach(function (id) {
          fineInsegnamento[id] = orario[i].fine;
          if (inizioInsegnamento[id] == null) inizioInsegnamento[id] = orario[i].inizio;
        });
      }
    });
    targetDellaSchedule(sog).forEach(function (x) {
      if (!discreto(x.target)) return;
      var dentro = blocchi.some(function (b) { return TIPI[b.tipo] && TIPI[b.tipo].prove && b.targetIds.indexOf(x.target.id) !== -1; });
      var continuo = (sc.continui || []).indexOf(x.target.id) !== -1;
      if (!dentro && !continuo) out.push({ livello: 'attenzione', testo: '“' + x.target.nome + '” non è in nessun blocco: in seduta non comparirà.' });
    });
    blocchi.forEach(function (b, i) {
      var tipo = TIPI[b.tipo];
      if (!tipo) return;
      if (!(+b.durataMin > 0)) out.push({ livello: 'attenzione', testo: '“' + b.nome + '” non ha una durata.' });
      if (tipo.prove && !b.targetIds.length) out.push({ livello: 'info', testo: '“' + b.nome + '” non ha target: in quel blocco si vedranno solo i target di tutta la seduta.' });
      if (b.tipo === 'probe') {
        var dopo = b.targetIds.filter(function (id) { return inizioInsegnamento[id] != null && inizioInsegnamento[id] < orario[i].inizio; });
        if (dopo.length) out.push({ livello: 'attenzione', testo: 'Il probe a freddo di ' + elenco(dopo, nomi) + ' viene dopo l’insegnamento: non è più “a freddo”.' });
      }
      if (b.tipo === 'probe_ritardato') {
        var ritardo = +b.ritardoMin || 0;
        var vicini = b.targetIds.filter(function (id) {
          return fineInsegnamento[id] == null || orario[i].inizio - fineInsegnamento[id] < ritardo;
        });
        var mai = vicini.filter(function (id) { return fineInsegnamento[id] == null || fineInsegnamento[id] > orario[i].inizio; });
        if (mai.length) out.push({ livello: 'attenzione', testo: 'Nel probe ritardato, ' + elenco(mai, nomi) + ' non ha insegnamento prima del probe.' });
        var corti = vicini.filter(function (id) { return mai.indexOf(id) === -1; });
        if (corti.length) out.push({ livello: 'attenzione', testo: 'Il probe ritardato di ' + elenco(corti, nomi) + ' arriva prima dei ' + ritardo + ' minuti di ritardo previsti.' });
      }
    });
    // Insegnamento di fila senza pause.
    var fila = 0;
    blocchi.forEach(function (b) {
      if (TIPI[b.tipo] && TIPI[b.tipo].contesto === 'insegnamento') fila += +b.durataMin || 0;
      else fila = 0;
      if (fila > PREDEFINITI.bloccoInsegnamentoMax * 2) {
        out.push({ livello: 'info', testo: 'Più di ' + PREDEFINITI.bloccoInsegnamentoMax * 2 + ' minuti di insegnamento di fila: valuta una pausa.' });
        fila = -Infinity;
      }
    });
    return out;
  }

  function elenco(ids, nomi) {
    var n = ids.map(function (id) { return '“' + (nomi[id] || id) + '”'; });
    return n.length > 1 ? n.slice(0, -1).join(', ') + ' e ' + n[n.length - 1] : n[0];
  }

  // ---- Durante la seduta ----------------------------------------------------

  function haScaletta(sog) { return !!(sog && sog.schedule && sog.schedule.blocchi && sog.schedule.blocchi.length); }

  // All'apertura la sessione tiene una copia della scaletta (così i nomi dei
  // blocchi restano anche se poi la schedule cambia) e parte dal primo blocco.
  function preparaSessione(sessione, sog, ora) {
    if (!haScaletta(sog)) return;
    sessione.scaletta = sog.schedule.blocchi.map(function (b) {
      return { id: b.id, tipo: b.tipo, nome: b.nome, durataMin: b.durataMin, targetIds: b.targetIds.slice(), prove: b.prove, ritardoMin: b.ritardoMin, nota: b.nota || '' };
    });
    sessione.continui = (sog.schedule.continui || []).slice();
    sessione.blocchiSvolti = [{ bloccoId: sessione.scaletta[0].id, inizio: ora }];
  }

  function bloccoInCorso(sessione) {
    var svolti = sessione && sessione.blocchiSvolti;
    if (!svolti || !svolti.length) return null;
    var ultimo = svolti[svolti.length - 1];
    if (ultimo.fine) return null;
    var b = (sessione.scaletta || []).find(function (x) { return x.id === ultimo.bloccoId; });
    return b ? { blocco: b, inizio: ultimo.inizio, indice: sessione.scaletta.indexOf(b) } : null;
  }

  // Passa a un altro blocco (il successivo se bloccoId manca). Restituisce il
  // nuovo blocco o null se la scaletta è finita.
  function passaA(sessione, bloccoId, ora) {
    var corrente = bloccoInCorso(sessione);
    var svolti = sessione.blocchiSvolti || (sessione.blocchiSvolti = []);
    if (svolti.length && !svolti[svolti.length - 1].fine) svolti[svolti.length - 1].fine = ora;
    var prossimo;
    if (bloccoId) prossimo = (sessione.scaletta || []).find(function (b) { return b.id === bloccoId; });
    else if (corrente) prossimo = sessione.scaletta[corrente.indice + 1];
    else prossimo = null;
    if (!prossimo) return null;
    svolti.push({ bloccoId: prossimo.id, inizio: ora });
    return prossimo;
  }

  function chiudi(sessione, ora) {
    var svolti = sessione.blocchiSvolti;
    if (svolti && svolti.length && !svolti[svolti.length - 1].fine) svolti[svolti.length - 1].fine = ora;
  }

  // Quali target mostrare adesso: quelli di tutta la seduta, poi quelli del
  // blocco in corso. Senza scaletta, tutti (come prima).
  function targetVisibili(sessione, tuttiIds) {
    var c = bloccoInCorso(sessione);
    if (!sessione.scaletta) return { continui: [], blocco: tuttiIds.slice() };
    var continui = (sessione.continui || []).filter(function (id) { return tuttiIds.indexOf(id) !== -1; });
    var delBlocco = c ? c.blocco.targetIds.filter(function (id) { return tuttiIds.indexOf(id) !== -1 && continui.indexOf(id) === -1; }) : [];
    return { continui: continui, blocco: delBlocco };
  }

  // Quanto manca al ritardo minimo del probe ritardato: minuti dalla fine
  // dell'ultimo blocco di insegnamento svolto (in ms, 0 se è già passato).
  function attesaRitardo(sessione, blocco, ora) {
    if (!blocco || blocco.tipo !== 'probe_ritardato' || !blocco.ritardoMin) return 0;
    var fine = 0;
    (sessione.blocchiSvolti || []).forEach(function (s) {
      var b = (sessione.scaletta || []).find(function (x) { return x.id === s.bloccoId; });
      if (b && TIPI[b.tipo] && TIPI[b.tipo].contesto === 'insegnamento' && s.fine) fine = Math.max(fine, s.fine);
    });
    if (!fine) return 0;
    return Math.max(0, fine + blocco.ritardoMin * 60000 - ora);
  }

  // Contesto e blocco da scrivere sugli eventi registrati adesso.
  function etichettaEvento(sessione) {
    var c = bloccoInCorso(sessione);
    if (!c) return null;
    return { blocco: c.blocco.id, contesto: TIPI[c.blocco.tipo] ? TIPI[c.blocco.tipo].contesto : 'nessuno' };
  }

  // ---- Dati per contesto ------------------------------------------------------

  // Eventi di un contesto: quelli registrati nei blocchi di quel tipo, più
  // gli "annulla" che li correggono (anche se toccati in un altro blocco).
  function eventiDelContesto(eventi, contesto) {
    var tenuti = {};
    var out = [];
    eventi.forEach(function (e) {
      if (e.tipo !== 'annulla' && e.contesto === contesto) { tenuti[e.id] = true; out.push(e); }
    });
    eventi.forEach(function (e) { if (e.tipo === 'annulla' && tenuti[e.rif]) out.push(e); });
    return out.sort(function (a, b) { return a.t - b.t; });
  }

  /*
   * Valore per contesto di una sessione: { probe: { valore, dettagli }, ... }
   * solo per i contesti con almeno un evento valido. null se gli eventi non
   * hanno contesto (sedute senza scaletta).
   */
  function valoriPerContesto(metodo, eventi, sessione) {
    if (!eventi.some(function (e) { return e.contesto; })) return null;
    var M = root.BR.modello;
    var out = {};
    Object.keys(CONTESTI).forEach(function (k) {
      var ev = eventiDelContesto(eventi, k);
      if (!M.eventiValidi(ev).length) return;
      var r = M.calcola(metodo, ev, sessione);
      out[k] = { valore: r.valore, dettagli: r.dettagli };
    });
    return out;
  }

  // Il punto di una serie visto in un solo contesto (null se in quella
  // sessione il contesto non ha dati).
  function puntoNelContesto(punto, contesto) {
    if (!contesto) return punto;
    var x = punto.perContesto && punto.perContesto[contesto];
    if (!x) return null;
    var p = {};
    Object.keys(punto).forEach(function (k) { p[k] = punto[k]; });
    p.valore = x.valore;
    p.dettagli = x.dettagli;
    return p;
  }

  function serieNelContesto(punti, contesto) {
    var out = punti.map(function (p) { return puntoNelContesto(p, contesto); }).filter(Boolean);
    out.escluse = punti.escluse || 0;
    return out;
  }

  // Durata reale dei blocchi svolti di una sessione chiusa, per il desktop.
  function riassuntoSvolti(sessione) {
    return (sessione.blocchiSvolti || []).map(function (s) {
      var b = (sessione.scaletta || []).find(function (x) { return x.id === s.bloccoId; }) || {};
      return { nome: b.nome || 'Blocco', tipo: b.tipo, previstiMin: b.durataMin, minuti: s.fine ? (s.fine - s.inizio) / 60000 : null };
    });
  }

  var api = {
    PREDEFINITI: PREDEFINITI, TIPI: TIPI, CONTESTI: CONTESTI, DISCRETE: DISCRETE,
    discreto: discreto, blocco: blocco, proponi: proponi, orari: orari, somma: somma, verifica: verifica,
    haScaletta: haScaletta, preparaSessione: preparaSessione, bloccoInCorso: bloccoInCorso, passaA: passaA, chiudi: chiudi,
    targetVisibili: targetVisibili, attesaRitardo: attesaRitardo, etichettaEvento: etichettaEvento,
    eventiDelContesto: eventiDelContesto, valoriPerContesto: valoriPerContesto,
    puntoNelContesto: puntoNelContesto, serieNelContesto: serieNelContesto, riassuntoSvolti: riassuntoSvolti
  };
  root.BR = root.BR || {};
  root.BR.seduta = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
