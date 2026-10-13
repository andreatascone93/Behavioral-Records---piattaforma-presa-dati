/*
 * Modello delle misure ABA: tipi di misura, livelli di prompt, calcolo del
 * valore per sessione a partire dagli eventi grezzi e verifica del criterio.
 * Vedi docs/modello-dati.md. Script classico (niente moduli) così funziona
 * anche aprendo i file con doppio clic; in Node si importa con require().
 */
(function (root) {
  'use strict';

  // Dal più intrusivo al meno intrusivo, come nel documento.
  var PROMPT = [
    { id: 'FT', nome: 'Fisico totale' },
    { id: 'FP', nome: 'Fisico parziale' },
    { id: 'M', nome: 'Modello' },
    { id: 'G', nome: 'Gestuale' },
    { id: 'V', nome: 'Verbale' },
    { id: 'I', nome: 'Indipendente' }
  ];

  var TIPI = {
    frequenza: {
      nome: 'Frequenza e tasso', strumento: 'contatore', strumentoNome: 'Contatore',
      unita: 'risposte/min', decimali: 2,
      descrizione: 'Comportamenti brevi e contabili',
      parametri: {}
    },
    durata: {
      nome: 'Durata', strumento: 'cronometro', strumentoNome: 'Cronometro avvia/ferma',
      unita: 'min', decimali: 1,
      descrizione: 'Comportamenti che durano nel tempo',
      parametri: {}
    },
    latenza: {
      nome: 'Latenza', strumento: 'latenza', strumentoNome: 'Cronometro a due tocchi',
      unita: 's', decimali: 1,
      descrizione: 'Tempo tra istruzione e risposta',
      parametri: {}
    },
    irt: {
      nome: 'Tempo tra risposte (IRT)', strumento: 'contatore', strumentoNome: 'Contatore',
      unita: 's', decimali: 1,
      descrizione: 'Ritmo di un comportamento',
      parametri: {}
    },
    intervallo_parziale: {
      nome: 'Intervallo parziale', strumento: 'intervalli', strumentoNome: 'Timer a intervalli',
      unita: '% intervalli', decimali: 0,
      descrizione: 'Comportamenti frequenti o difficili da contare',
      parametri: { intervalloSec: 10, osservazioneMin: 5 }
    },
    intervallo_totale: {
      nome: 'Intervallo totale', strumento: 'intervalli', strumentoNome: 'Timer a intervalli',
      unita: '% intervalli', decimali: 0,
      descrizione: 'Comportamenti continui da aumentare',
      parametri: { intervalloSec: 10, osservazioneMin: 5 }
    },
    momentaneo: {
      nome: 'Campionamento momentaneo', strumento: 'intervalli', strumentoNome: 'Timer che vibra',
      unita: '% istanti', decimali: 0,
      descrizione: 'Osservazioni lunghe o più soggetti',
      parametri: { intervalloSec: 10, osservazioneMin: 5 }
    },
    dtt: {
      nome: 'Prove discrete (DTT)', strumento: 'prove', strumentoNome: 'Griglia prove',
      unita: '% indipendenti', decimali: 0,
      descrizione: 'Insegnamento di abilità',
      parametri: { prove: 10 }
    },
    task_analysis: {
      nome: 'Task analysis', strumento: 'passi', strumentoNome: 'Lista dei passi',
      unita: '% passi indipendenti', decimali: 0,
      descrizione: 'Catene di passi',
      parametri: { passi: [] }
    },
    abc: {
      nome: 'ABC', strumento: 'abc', strumentoNome: 'Scheda ABC',
      unita: 'episodi', decimali: 0,
      descrizione: 'Osservazione descrittiva per l’ipotesi di funzione, non un intervento',
      parametri: {
        antecedenti: ['Richiesta di compito', 'Attenzione negata', 'Transizione', 'Oggetto tolto'],
        comportamenti: [],
        conseguenze: ['Attenzione', 'Compito rimosso', 'Oggetto dato', 'Ignorato']
      }
    }
  };

  var FASI = {
    baseline: 'Baseline',
    intervento: 'Intervento',
    assottigliamento: 'Assottigliamento dello schema',
    mantenimento: 'Mantenimento',
    generalizzazione: 'Generalizzazione',
    follow_up: 'Follow-up'
  };

  // Toglie gli eventi annullati e gli stessi eventi "annulla".
  function eventiValidi(eventi) {
    var annullati = {};
    eventi.forEach(function (e) { if (e.tipo === 'annulla') annullati[e.rif] = true; });
    return eventi
      .filter(function (e) { return e.tipo !== 'annulla' && !annullati[e.id]; })
      .sort(function (a, b) { return a.t - b.t; });
  }

  function media(xs) {
    if (!xs.length) return null;
    return xs.reduce(function (s, x) { return s + x; }, 0) / xs.length;
  }

  function mediana(xs) {
    if (!xs.length) return null;
    var s = xs.slice().sort(function (a, b) { return a - b; });
    var m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  // Abbina eventi di apertura e chiusura (inizio/fine, istruzione/risposta).
  // Un'apertura senza chiusura viene chiusa a fineMs, se fornito.
  function coppie(eventi, apre, chiude, fineMs) {
    var out = [];
    var aperto = null;
    eventi.forEach(function (e) {
      if (e.tipo === apre) aperto = e;
      else if (e.tipo === chiude && aperto) { out.push([aperto.t, e.t]); aperto = null; }
    });
    if (aperto && fineMs != null) out.push([aperto.t, fineMs]);
    return out;
  }

  function percentuale(n, d) { return d ? (n / d) * 100 : null; }

  // Posizione nella scala dei prompt: 0 = fisico totale, 5 = indipendente.
  function indicePrompt(id) { return PROMPT.findIndex(function (x) { return x.id === id; }); }

  // Una risposta conta per il criterio se il prompt è al livello richiesto o
  // meno intrusivo: con livello 'V' valgono V e I. Senza livello, solo I.
  function promptAccettato(prompt, livello) {
    var i = indicePrompt(prompt);
    return i !== -1 && i >= indicePrompt(livello || 'I');
  }

  /*
   * Valore per sessione di un metodo.
   * sessione: { inizio: ms, fine: ms | null }
   * Restituisce { valore, dettagli } con valore = null se non ci sono dati.
   */
  function calcola(metodo, eventiGrezzi, sessione) {
    // Le conseguenze registrate secondo il piano non sono dati del comportamento.
    var ev = eventiValidi(eventiGrezzi).filter(function (e) { return e.tipo !== 'conseguenza'; });
    var p = metodo.parametri || {};
    var fine = sessione.fine != null ? sessione.fine : (ev.length ? ev[ev.length - 1].t : sessione.inizio);
    // Il tasso si calcola su almeno un minuto, così una seduta di prova di pochi
    // secondi non produce valori assurdi.
    var minuti = Math.max((fine - sessione.inizio) / 60000, 1);

    switch (metodo.tipo) {
      case 'frequenza': {
        var n = ev.filter(function (e) { return e.tipo === 'occorrenza'; }).length;
        return { valore: n / minuti, dettagli: { conteggio: n, minuti: minuti } };
      }
      case 'irt': {
        var ts = ev.filter(function (e) { return e.tipo === 'occorrenza'; }).map(function (e) { return e.t; });
        var gaps = [];
        for (var i = 1; i < ts.length; i++) gaps.push((ts[i] - ts[i - 1]) / 1000);
        return { valore: media(gaps), dettagli: { conteggio: ts.length, mediana: mediana(gaps) } };
      }
      case 'durata': {
        var ep = coppie(ev, 'inizio', 'fine', sessione.fine);
        var sec = ep.map(function (c) { return (c[1] - c[0]) / 1000; });
        var tot = sec.reduce(function (s, x) { return s + x; }, 0);
        return {
          valore: tot / 60,
          dettagli: { episodi: ep.length, mediaSec: media(sec), percentualeSessione: percentuale(tot / 60, minuti) }
        };
      }
      case 'latenza': {
        var lat = coppie(ev, 'istruzione', 'risposta', null).map(function (c) { return (c[1] - c[0]) / 1000; });
        return { valore: media(lat), dettagli: { prove: lat.length, mediana: mediana(lat) } };
      }
      case 'intervallo_parziale':
      case 'intervallo_totale':
      case 'momentaneo': {
        // Un solo esito per intervallo: vale l'ultimo registrato.
        var perIndice = {};
        ev.filter(function (e) { return e.tipo === 'intervallo'; })
          .forEach(function (e) { perIndice[e.valore.indice] = e.valore.presente; });
        var esiti = Object.keys(perIndice).map(function (k) { return perIndice[k]; });
        var si = esiti.filter(Boolean).length;
        return { valore: percentuale(si, esiti.length), dettagli: { intervalli: esiti.length, conComportamento: si, intervalloSec: p.intervalloSec } };
      }
      case 'dtt': {
        var prove = ev.filter(function (e) { return e.tipo === 'prova'; });
        var dist = {};
        PROMPT.forEach(function (x) { dist[x.id] = 0; });
        dist.errore = 0;
        prove.forEach(function (e) {
          if (e.valore.esito === 'errore') dist.errore++;
          else dist[e.valore.prompt] = (dist[e.valore.prompt] || 0) + 1;
        });
        // La prima prova della seduta serve ai criteri sulla prima prova del
        // giorno (sondaggio a freddo).
        var prima = prove.length ? { esito: prove[0].valore.esito, prompt: prove[0].valore.prompt } : null;
        return { valore: percentuale(dist.I, prove.length), dettagli: { prove: prove.length, distribuzione: dist, primaProva: prima } };
      }
      case 'task_analysis': {
        var perPasso = {};
        ev.filter(function (e) { return e.tipo === 'passo'; })
          .forEach(function (e) { perPasso[e.valore.indice] = e.valore.prompt; });
        var livelli = Object.keys(perPasso).map(function (k) { return perPasso[k]; });
        var indip = livelli.filter(function (x) { return x === 'I'; }).length;
        return { valore: percentuale(indip, livelli.length), dettagli: { passiRegistrati: livelli.length, indipendenti: indip, perPasso: perPasso } };
      }
      case 'abc': {
        var episodi = ev.filter(function (e) { return e.tipo === 'abc'; });
        var combinazioni = {};
        episodi.forEach(function (e) {
          var k = [e.valore.a, e.valore.b, e.valore.c].join(' → ');
          combinazioni[k] = (combinazioni[k] || 0) + 1;
        });
        return { valore: episodi.length, dettagli: { combinazioni: combinazioni } };
      }
      default:
        return { valore: null, dettagli: {} };
    }
  }

  /*
   * Criterio: { soglia, verso: 'almeno' | 'al_massimo', sessioni } più, se
   * servono, le richieste che lo rendono più severo:
   *   livelloPrompt: 'V' | 'G' | 'M' | 'FP' (DTT e task analysis): contano le
   *     risposte a quel livello di prompt o meno intrusive, non solo le
   *     indipendenti;
   *   primaProva: true (DTT): conta solo la prima prova della prima seduta di
   *     ogni giorno (Lerman et al., 2011; Cummings & Carr, 2009);
   *   minOperatori, minSetting: tra le sessioni consecutive a criterio ci
   *     devono essere almeno tanti operatori o setting diversi (Stokes & Baer,
   *     1977).
   */

  /*
   * Valore di una sessione per il criterio. Di solito è il valore della
   * misura; con un livello di prompt è la percentuale di risposte a quel
   * livello o meno intrusive; con la prima prova vale 100 se la prima prova
   * è corretta al livello richiesto, 0 se no.
   * punto: { valore, dettagli } come in archivio.serie.
   */
  function valoreCriterio(criterio, tipo, punto) {
    if (!punto) return null;
    var d = punto.dettagli || {};
    var livello = criterio && criterio.livelloPrompt;
    if (tipo === 'dtt' && criterio && criterio.primaProva) {
      if (!d.primaProva) return null;
      return d.primaProva.esito !== 'errore' && promptAccettato(d.primaProva.prompt, livello) ? 100 : 0;
    }
    if (livello && livello !== 'I') {
      if (tipo === 'dtt' && d.distribuzione) {
        var ok = 0;
        PROMPT.forEach(function (x) { if (promptAccettato(x.id, livello)) ok += d.distribuzione[x.id] || 0; });
        return percentuale(ok, d.prove);
      }
      if (tipo === 'task_analysis' && d.perPasso) {
        var liv = Object.keys(d.perPasso).map(function (k) { return d.perPasso[k]; });
        return percentuale(liv.filter(function (x) { return promptAccettato(x, livello); }).length, liv.length);
      }
    }
    return punto.valore;
  }

  /*
   * valori: valori per sessione in ordine cronologico, già filtrati sulla fase
   * in corso. Ogni valore è un numero oppure { valore, operatore, setting },
   * che serve quando il criterio chiede più operatori o setting.
   * Restituisce { raggiunto, consecutive, mancano, operatori, setting,
   * mancanoOperatori, mancanoSetting }.
   */
  function verificaCriterio(criterio, valori) {
    if (!criterio) return null;
    var ok = function (v) {
      if (v == null) return false;
      return criterio.verso === 'al_massimo' ? v <= criterio.soglia : v >= criterio.soglia;
    };
    var consecutive = 0, operatori = {}, setting = {};
    for (var i = valori.length - 1; i >= 0; i--) {
      var x = valori[i];
      var oggetto = x !== null && typeof x === 'object';
      if (!ok(oggetto ? x.valore : x)) break;
      consecutive++;
      if (oggetto && x.operatore) operatori[x.operatore] = true;
      if (oggetto && x.setting) setting[String(x.setting).trim().toLowerCase()] = true;
    }
    var nOp = Object.keys(operatori).length, nSet = Object.keys(setting).length;
    var minOp = +criterio.minOperatori || 1, minSet = +criterio.minSetting || 1;
    var mancanoOp = minOp > 1 ? Math.max(minOp - nOp, 0) : 0;
    var mancanoSet = minSet > 1 ? Math.max(minSet - nSet, 0) : 0;
    return {
      raggiunto: consecutive >= criterio.sessioni && !mancanoOp && !mancanoSet,
      consecutive: Math.min(consecutive, criterio.sessioni),
      mancano: Math.max(criterio.sessioni - consecutive, 0),
      operatori: nOp,
      setting: nSet,
      mancanoOperatori: mancanoOp,
      mancanoSetting: mancanoSet
    };
  }

  // Testo breve sullo stato del criterio, per le pillole di desktop e telefono.
  function statoCriterioBreve(c) {
    if (!c) return 'Senza criterio';
    if (c.raggiunto) return 'Criterio raggiunto';
    if (c.consecutive > 0 && !c.mancano && (c.mancanoOperatori || c.mancanoSetting)) {
      var serve = [];
      if (c.mancanoOperatori) serve.push(c.mancanoOperatori === 1 ? 'un altro operatore' : c.mancanoOperatori + ' altri operatori');
      if (c.mancanoSetting) serve.push(c.mancanoSetting === 1 ? 'un altro setting' : c.mancanoSetting + ' altri setting');
      return 'A criterio, manca ' + serve.join(' e ');
    }
    if (c.consecutive > 0) return c.consecutive + ' di ' + (c.consecutive + c.mancano) + ' sessioni a criterio';
    return 'Sotto criterio';
  }

  var NOMI_LIVELLO = { V: 'verbale', G: 'gestuale', M: 'modello', FP: 'fisico parziale', FT: 'fisico totale' };

  function descriviCriterio(criterio, tipo) {
    if (!criterio) return 'Nessun criterio';
    var t = TIPI[tipo];
    var verso = criterio.verso === 'al_massimo' ? '≤' : '≥';
    var livello = (tipo === 'dtt' || tipo === 'task_analysis') && criterio.livelloPrompt && criterio.livelloPrompt !== 'I' ? criterio.livelloPrompt : null;
    var conPrompt = livello ? (livello === 'M' ? 'con modello o prompt meno intrusivo' : 'con prompt ' + NOMI_LIVELLO[livello] + ' o meno intrusivo') : '';
    var testo;
    if (tipo === 'dtt' && criterio.primaProva) {
      testo = 'Prima prova del giorno corretta ' + (livello ? conPrompt : 'e indipendente') + ' per ' + criterio.sessioni + ' giorni consecutivi';
    } else {
      var unita = livello ? (tipo === 'dtt' ? '% risposte corrette ' : '% passi ') + conPrompt : t.unita;
      testo = verso + ' ' + formatta(criterio.soglia, tipo) + ' ' + unita + ' per ' + criterio.sessioni + ' sessioni consecutive';
    }
    if (+criterio.minOperatori > 1) testo += ', con almeno ' + criterio.minOperatori + ' operatori diversi';
    if (+criterio.minSetting > 1) testo += ', in almeno ' + criterio.minSetting + ' setting diversi';
    return testo;
  }

  function formatta(valore, tipo) {
    if (valore == null || isNaN(valore)) return '–';
    var d = TIPI[tipo] ? TIPI[tipo].decimali : 1;
    return valore.toFixed(d).replace('.', ',');
  }

  // Identificativi generati sul dispositivo, univoci anche offline.
  function nuovoId(prefisso) {
    var r = '';
    if (root.crypto && root.crypto.randomUUID) r = root.crypto.randomUUID();
    else r = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    return (prefisso ? prefisso + '_' : '') + r;
  }

  var api = {
    PROMPT: PROMPT,
    TIPI: TIPI,
    FASI: FASI,
    eventiValidi: eventiValidi,
    calcola: calcola,
    verificaCriterio: verificaCriterio,
    valoreCriterio: valoreCriterio,
    statoCriterioBreve: statoCriterioBreve,
    promptAccettato: promptAccettato,
    descriviCriterio: descriviCriterio,
    formatta: formatta,
    media: media,
    mediana: mediana,
    nuovoId: nuovoId
  };

  root.BR = root.BR || {};
  root.BR.modello = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
