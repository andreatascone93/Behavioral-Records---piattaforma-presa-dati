/*
 * Piano di intervento: ruoli dei target, ipotesi di funzione, procedure di
 * insegnamento, interventi sull'antecedente e conseguenze programmate
 * (schemi di rinforzo, rinforzo differenziale, estinzione, schemi
 * concorrenti), organizzati in fasi pianificate.
 * Vedi docs/piano-intervento.md per le definizioni e la letteratura.
 * Script classico come modello.js; in Node si importa con require().
 */
(function (root) {
  'use strict';

  // ---- Cataloghi -------------------------------------------------------------

  // Il ruolo dice cosa il target è nel piano. La valutazione (es. ABC) non è
  // un intervento: serve a formulare l'ipotesi di funzione.
  var RUOLI = {
    problema: { nome: 'Comportamento problema', breve: 'Da ridurre', direzione: 'ridurre' },
    sostitutivo: { nome: 'Comportamento sostitutivo', breve: 'Sostitutivo', direzione: 'aumentare' },
    abilita: { nome: 'Abilità da insegnare', breve: 'Abilità', direzione: 'aumentare' },
    valutazione: { nome: 'Strumento di valutazione funzionale', breve: 'Valutazione', direzione: null }
  };

  var FUNZIONI = {
    attenzione: { nome: 'Attenzione', rinforzo: 'Rinforzo sociale positivo', estinzione: 'attenzione' },
    fuga: { nome: 'Fuga o evitamento', rinforzo: 'Rinforzo sociale negativo', estinzione: 'fuga' },
    tangibile: { nome: 'Accesso a oggetti o attività', rinforzo: 'Rinforzo sociale positivo', estinzione: 'tangibile' },
    automatica: { nome: 'Automatica positiva (sensoriale)', rinforzo: 'Rinforzo automatico positivo', estinzione: 'sensoriale' },
    automatica_negativa: { nome: 'Automatica negativa (es. sollievo dal dolore)', rinforzo: 'Rinforzo automatico negativo', estinzione: 'sensoriale' },
    multipla: { nome: 'Funzioni multiple', rinforzo: 'Più fonti di rinforzo', estinzione: null },
    da_definire: { nome: 'Da definire', rinforzo: '', estinzione: null }
  };

  /*
   * Funzioni di un comportamento problema: l'ipotesi principale più le altre
   * (controllo multiplo). Con sintetizzata = true le funzioni operano insieme,
   * come nella contingenza sintetizzata dell'IISCA (Hanley et al., 2014):
   * il rinforzatore dell'alternativa le combina tutte.
   */
  function funzioniDi(t) {
    var f = t && t.funzione;
    if (!f) return [];
    return [f.ipotesi].concat(f.altre || []).filter(function (k, i, a) {
      return FUNZIONI[k] && k !== 'multipla' && k !== 'da_definire' && a.indexOf(k) === i;
    });
  }

  function descriviFunzione(t) {
    var f = t && t.funzione;
    var elenco = funzioniDi(t);
    if (!elenco.length) return f && f.ipotesi === 'multipla' ? FUNZIONI.multipla.nome : 'Da definire';
    var testo = elenco.map(function (k, i) { var n = FUNZIONI[k].nome; return i ? n.toLowerCase() : n; }).join(' + ');
    if (f.sintetizzata && elenco.length > 1) testo += ', sintetizzate (IISCA)';
    return testo;
  }

  var FONTI_VALUTAZIONE = {
    indiretta: 'Valutazione indiretta (interviste, questionari)',
    descrittiva: 'Osservazione descrittiva (ABC, scatter plot)',
    analisi_funzionale: 'Analisi funzionale sperimentale',
    iisca: 'Analisi funzionale sintetizzata (IISCA)'
  };

  var CERTEZZA = { ipotesi: 'Ipotesi', probabile: 'Probabile', confermata: 'Confermata sperimentalmente' };

  // Schemi di rinforzo. valore: rapporto (n risposte) o tempo (s).
  var SCHEMI = {
    CRF: { nome: 'Continuo (CRF)', sigla: 'CRF', valore: null },
    FR: { nome: 'Rapporto fisso', sigla: 'FR', valore: 'risposte' },
    VR: { nome: 'Rapporto variabile', sigla: 'VR', valore: 'risposte (media)' },
    FI: { nome: 'Intervallo fisso', sigla: 'FI', valore: 's' },
    VI: { nome: 'Intervallo variabile', sigla: 'VI', valore: 's (media)' },
    FT: { nome: 'Tempo fisso (non contingente)', sigla: 'FT', valore: 's' },
    VT: { nome: 'Tempo variabile (non contingente)', sigla: 'VT', valore: 's (media)' },
    EXT: { nome: 'Estinzione', sigla: 'EXT', valore: null }
  };

  var CATEGORIE_RINFORZATORE = {
    sociale: 'Sociale (lodi, attenzione)',
    tangibile: 'Oggetto o giocattolo',
    attivita: 'Attività',
    commestibile: 'Commestibile',
    sensoriale: 'Sensoriale',
    pausa: 'Pausa dal compito',
    token: 'Token'
  };

  var QUALITA = { alta: 'Alta preferenza', media: 'Media preferenza', bassa: 'Bassa preferenza' };

  /*
   * Procedure di conseguenza. ruoli: a quali target si applicano.
   * campi: cosa il clinico deve specificare perché la procedura sia replicabile.
   * restrittiva: procedure basate sulla punizione, che richiedono motivazione
   * scritta e il fallimento documentato di alternative meno restrittive.
   */
  var PROCEDURE = {
    rinforzo_positivo: {
      nome: 'Rinforzo positivo', gruppo: 'rinforzo', ruoli: ['abilita', 'sostitutivo'],
      campi: ['schema', 'rinforzatore']
    },
    rinforzo_negativo: {
      nome: 'Rinforzo negativo (pausa contingente)', gruppo: 'rinforzo', ruoli: ['abilita', 'sostitutivo'],
      campi: ['schema', 'pausaSec']
    },
    token: {
      nome: 'Economia simbolica (token)', gruppo: 'rinforzo', ruoli: ['abilita', 'sostitutivo'],
      // I tre schemi del token (Hackenberg, 2009; Ivy et al., 2017):
      // produzione (schema), scambio (tokenPerScambio), prezzi del menu.
      campi: ['schema', 'tokenPerScambio', 'prezzi']
    },
    drh: {
      nome: 'Rinforzo differenziale di tassi alti (DRH)', gruppo: 'differenziale', ruoli: ['abilita', 'sostitutivo'],
      campi: ['minimo', 'intervalloSec', 'rinforzatore']
    },
    fct: {
      nome: 'Training di comunicazione funzionale (FCT)', gruppo: 'differenziale', ruoli: ['problema'],
      campi: ['alternativoId', 'schema', 'rinforzatore', 'problema']
    },
    dra: {
      nome: 'Rinforzo differenziale di comportamento alternativo (DRA)', gruppo: 'differenziale', ruoli: ['problema'],
      campi: ['alternativoId', 'schema', 'rinforzatore', 'problema']
    },
    dri: {
      nome: 'Rinforzo differenziale di comportamento incompatibile (DRI)', gruppo: 'differenziale', ruoli: ['problema'],
      campi: ['alternativoId', 'schema', 'rinforzatore', 'problema']
    },
    dro: {
      nome: 'Rinforzo differenziale di altri comportamenti (DRO)', gruppo: 'differenziale', ruoli: ['problema'],
      campi: ['varianteDro', 'intervalloSec', 'azzera', 'rinforzatore']
    },
    drl: {
      nome: 'Rinforzo differenziale di tassi bassi (DRL)', gruppo: 'differenziale', ruoli: ['problema'],
      campi: ['varianteDrl', 'limite', 'intervalloSec', 'rinforzatore']
    },
    estinzione: {
      nome: 'Estinzione', gruppo: 'estinzione', ruoli: ['problema'],
      campi: ['varianteEstinzione']
    },
    blocco: {
      nome: 'Blocco della risposta', gruppo: 'estinzione', ruoli: ['problema'],
      campi: []
    },
    costo_risposta: {
      nome: 'Costo della risposta', gruppo: 'punizione', ruoli: ['problema'], restrittiva: true,
      campi: ['perdita']
    },
    timeout: {
      nome: 'Time-out dal rinforzo positivo', gruppo: 'punizione', ruoli: ['problema'], restrittiva: true,
      campi: ['varianteTimeout', 'durataSec']
    }
  };

  var GRUPPI = {
    rinforzo: 'Rinforzo',
    differenziale: 'Rinforzo differenziale',
    estinzione: 'Estinzione',
    punizione: 'Punizione (procedure restrittive)'
  };

  var VARIANTI = {
    varianteDro: {
      intervallo_fisso: 'Intervallo intero, fisso',
      intervallo_variabile: 'Intervallo intero, variabile',
      momentaneo_fisso: 'Momentaneo, fisso',
      momentaneo_variabile: 'Momentaneo, variabile'
    },
    varianteDrl: {
      sessione: 'Sessione intera (al massimo N risposte)',
      intervalli: 'A intervalli (al massimo N per intervallo)',
      distanziate: 'Risposte distanziate (IRT minimo)'
    },
    varianteEstinzione: {
      attenzione: 'Attenzione: nessuna attenzione dopo il comportamento',
      fuga: 'Fuga: la richiesta resta, si guida al completamento',
      tangibile: 'Tangibile: l’oggetto non viene dato',
      sensoriale: 'Sensoriale: si attenua la conseguenza sensoriale'
    },
    varianteTimeout: {
      non_esclusionario: 'Non esclusionario (resta nella stanza)',
      esclusionario: 'Esclusionario'
    },
    // Cosa succede al comportamento problema mentre si rinforza l'alternativa.
    problema: {
      estinzione: 'In estinzione',
      rinforzo: 'Ancora rinforzato (schemi concorrenti)'
    }
  };

  var ANTECEDENTI = {
    ncr: { nome: 'Rinforzo non contingente (NCR)', campi: ['schema', 'rinforzatore'] },
    alta_probabilita: { nome: 'Sequenza di richieste ad alta probabilità', campi: ['richieste'] },
    scelta: { nome: 'Possibilità di scelta', campi: [] },
    agenda_visiva: { nome: 'Agenda visiva', campi: [] },
    preavviso: { nome: 'Preavviso delle transizioni', campi: [] },
    priming: { nome: 'Priming', campi: [] },
    modifica_compito: { nome: 'Modifica del compito (difficoltà, durata, alternanza)', campi: [] },
    arricchimento: { nome: 'Arricchimento ambientale', campi: [] },
    altro: { nome: 'Altro', campi: [] }
  };

  var FORMATI = {
    dtt: 'Prove discrete (DTT)',
    net: 'Insegnamento naturalistico (NET)',
    catena_avanti: 'Concatenamento in avanti',
    catena_indietro: 'Concatenamento all’indietro',
    catena_totale: 'Presentazione del compito totale',
    shaping: 'Modellaggio (shaping)'
  };

  var STRATEGIE_PROMPT = {
    meno_intrusivo: 'Dal più al meno intrusivo (most-to-least)',
    piu_intrusivo: 'Dal meno al più intrusivo (least-to-most)',
    ritardo_costante: 'Ritardo costante',
    ritardo_progressivo: 'Ritardo progressivo',
    guida_graduata: 'Guida graduata',
    nessuno: 'Nessun prompt pianificato'
  };

  var CORREZIONI = {
    ripresenta_prompt: 'Ripresenta la prova con il prompt efficace',
    modello_ripeti: 'Modello, poi prova indipendente',
    passa: 'Nessuna correzione, prova successiva',
    errorless: 'Senza errori (prompt immediato)'
  };

  // Tipi di fase: gli stessi di modello.js, che li usa anche per i grafici.
  var FASI = root.BR && root.BR.modello ? root.BR.modello.FASI : require('./modello.js').FASI;

  // ---- Descrizioni ----------------------------------------------------------

  function num(x) { return String(x).replace('.', ','); }

  function descriviSchema(s) {
    if (!s || !s.tipo) return '–';
    var d = SCHEMI[s.tipo];
    if (!d) return s.tipo;
    var testo = d.valore ? d.sigla + ' ' + num(s.valore) + (/^s/.test(d.valore) ? ' s' : '') : d.sigla;
    if (s.segnalato) {
      testo = 'mult ' + testo + '/EXT (' + num(s.segnalato.sdSec) + ' s con ' + (s.segnalato.stimoloSd || 'SD') +
        ', ' + num(s.segnalato.sdeltaSec) + ' s con ' + (s.segnalato.stimoloSdelta || 'SΔ') + ')';
    }
    return testo;
  }

  function descriviRinforzatore(r) {
    if (!r || !r.descrizione) return '';
    var parti = [r.descrizione];
    if (r.magnitudo) parti.push(r.magnitudo);
    if (r.qualita) parti.push(QUALITA[r.qualita].toLowerCase());
    if (r.ritardoSec) parti.push('dopo ' + num(r.ritardoSec) + ' s');
    return parti.join(', ');
  }

  // targets: mappa id → target, per scrivere il nome dell'alternativa.
  function descriviContingenza(c, targets) {
    var p = c.parametri || {};
    var r = descriviRinforzatore(c.rinforzatore);
    var nomeAlt = p.alternativoId && targets && targets[p.alternativoId] ? targets[p.alternativoId].nome : 'alternativa da scegliere';
    var conR = function (s) { return r ? s + ' · ' + r : s; };
    switch (c.procedura) {
      case 'rinforzo_positivo': return conR(descriviSchema(c.schema));
      case 'rinforzo_negativo': return descriviSchema(c.schema) + ' · pausa di ' + num(p.pausaSec || 0) + ' s';
      case 'token': {
        var menu = (p.prezzi || []).map(function (x) { return x.descrizione + ' ' + x.costo; }).join(', ');
        return 'Un token con ' + descriviSchema(c.schema) + '; scambio dopo ' + (p.tokenPerScambio || '?') + ' token' +
          (menu ? '; menu: ' + menu : r ? ' · ' + r : '');
      }
      case 'drh': return conR('Almeno ' + (p.minimo || '?') + ' risposte in ' + num(p.intervalloSec || 0) + ' s');
      case 'fct': case 'dra': case 'dri': {
        var prob = p.problema === 'rinforzo'
          ? 'problema ancora rinforzato con ' + descriviSchema(p.schemaProblema) + (p.rinforzatoreProblema && p.rinforzatoreProblema.descrizione ? ' · ' + descriviRinforzatore(p.rinforzatoreProblema) : '')
          : 'problema in estinzione';
        return conR('“' + nomeAlt + '” con ' + descriviSchema(c.schema)) + '; ' + prob;
      }
      case 'dro': return conR((VARIANTI.varianteDro[p.variante] || 'DRO') + ' ' + num(p.intervalloSec || 0) + ' s' + (p.azzera ? ', si azzera dopo il comportamento' : ''));
      case 'drl':
        if (p.variante === 'distanziate') return conR('IRT di almeno ' + num(p.intervalloSec || 0) + ' s');
        return conR('Al massimo ' + (p.limite != null ? p.limite : '?') + ' risposte ' + (p.variante === 'intervalli' ? 'ogni ' + num(p.intervalloSec || 0) + ' s' : 'nella sessione'));
      case 'estinzione': return VARIANTI.varianteEstinzione[p.variante] || 'Variante da scegliere';
      case 'blocco': return 'Il comportamento viene interrotto fisicamente, senza conseguenze aggiuntive';
      case 'costo_risposta': return 'Perdita di ' + (p.perdita || '?');
      case 'timeout': return (VARIANTI.varianteTimeout[p.variante] || 'Time-out') + ', ' + num(p.durataSec || 0) + ' s';
      default: return '';
    }
  }

  // Menu dei rinforzatori di scambio, una riga per voce: "nome = token".
  function leggiPrezzi(testo) {
    return String(testo || '').split('\n').map(function (riga) {
      var m = riga.match(/^\s*(.+?)\s*=\s*(\d+)\s*$/);
      return m ? { descrizione: m[1], costo: +m[2] } : null;
    }).filter(Boolean);
  }
  function scriviPrezzi(prezzi) {
    return (prezzi || []).map(function (x) { return x.descrizione + ' = ' + x.costo; }).join('\n');
  }

  function siglaContingenza(c) {
    var sigle = { rinforzo_positivo: 'SR+', rinforzo_negativo: 'SR−', fct: 'FCT', dra: 'DRA', dri: 'DRI', dro: 'DRO', drl: 'DRL', drh: 'DRH', estinzione: 'EXT', token: 'Token', blocco: 'Blocco', costo_risposta: 'Costo risposta', timeout: 'Time-out' };
    return sigle[c.procedura] || c.procedura;
  }

  function descriviAntecedente(a) {
    var d = ANTECEDENTI[a.tipo];
    var base = d ? d.nome : a.tipo;
    if (a.tipo === 'ncr') base += ': ' + descriviSchema(a.schema) + (a.rinforzatore && a.rinforzatore.descrizione ? ' · ' + descriviRinforzatore(a.rinforzatore) : '');
    if (a.tipo === 'alta_probabilita' && a.richieste) base += ': ' + a.richieste + ' richieste facili prima di quella difficile';
    return base + (a.dettaglio ? '. ' + a.dettaglio : '');
  }

  // Schemi concorrenti: nella stessa fase, l'alternativa e il problema sono
  // entrambi rinforzati, con parametri diversi (qualità, ritardo, schema).
  function schemiConcorrenti(fase) {
    return (fase.contingenze || []).some(function (c) {
      return /^(fct|dra|dri)$/.test(c.procedura) && c.parametri && c.parametri.problema === 'rinforzo';
    });
  }

  // Obiettivo in forma comportamentale: condizione, comportamento, criterio.
  function obiettivo(target, descrizioneCriterio) {
    var cond = target.obiettivo && target.obiettivo.condizione ? target.obiettivo.condizione.trim() : '';
    if (!cond && !descrizioneCriterio) return '';
    return (cond ? cond.charAt(0).toUpperCase() + cond.slice(1) + ', ' : '') +
      '“' + target.nome + '”' + (descrizioneCriterio ? ': ' + descrizioneCriterio : '') + '.';
  }

  // ---- Fasi pianificate ------------------------------------------------------

  function fasePianificata(programma, pianoId) {
    var fasi = programma.piano && programma.piano.fasi ? programma.piano.fasi : [];
    return fasi.find(function (f) { return f.id === pianoId; }) || null;
  }

  // Nome da mostrare per una fase svolta: quello della fase pianificata, se c'è.
  function nomeFase(programma, voce) {
    if (!voce) return FASI.baseline;
    var pf = voce.pianoId ? fasePianificata(programma, voce.pianoId) : null;
    if (pf && pf.nome) return pf.nome;
    return FASI[voce.tipo] || voce.tipo;
  }

  // La fase pianificata dopo quella in corso, se il piano ne prevede una.
  function prossimaFase(programma) {
    var fasi = programma.piano && programma.piano.fasi ? programma.piano.fasi : [];
    if (!fasi.length) return null;
    var storia = programma.fasi || [];
    var corrente = storia.length ? storia[storia.length - 1] : null;
    var i = corrente && corrente.pianoId ? fasi.findIndex(function (f) { return f.id === corrente.pianoId; }) : -1;
    return fasi[i + 1] || null;
  }

  // La fase pianificata prima di quella in corso: dove si torna se i dati
  // peggiorano (regola di ritorno, Greer et al., 2016).
  function fasePrecedente(programma) {
    var fasi = programma.piano && programma.piano.fasi ? programma.piano.fasi : [];
    var corrente = faseInCorso(programma);
    var i = corrente ? fasi.indexOf(corrente) : -1;
    return i > 0 ? fasi[i - 1] : null;
  }

  /*
   * Regole decisionali della fase in corso, dai valori per sessione di ogni
   * target nella fase (valoriPerTarget: { targetId: [valori] }).
   *   ritorno: { targetId, soglia, verso, sessioni } → se vale, si torna alla
   *            fase precedente;
   *   stalloSessioni: n → dopo n sessioni senza nessun criterio raggiunto si
   *            rivede il programma.
   * Restituisce { ritorno: bool, stallo: bool, sessioni: n }.
   */
  function valutaRegole(fase, valoriPerTarget, criteriRaggiunti) {
    var out = { ritorno: false, stallo: false, sessioni: 0 };
    if (!fase) return out;
    Object.keys(valoriPerTarget).forEach(function (k) { out.sessioni = Math.max(out.sessioni, valoriPerTarget[k].length); });
    var r = fase.ritorno;
    if (r && r.targetId && valoriPerTarget[r.targetId]) {
      var M = root.BR && root.BR.modello ? root.BR.modello : require('./modello.js');
      out.ritorno = !!M.verificaCriterio(r, valoriPerTarget[r.targetId]).raggiunto;
    }
    if (fase.stalloSessioni && out.sessioni >= fase.stalloSessioni && !criteriRaggiunti) out.stallo = true;
    return out;
  }

  function descriviRitorno(r, targets) {
    if (!r || !r.targetId) return '';
    var t = targets && targets[r.targetId];
    return 'Torna alla fase precedente se “' + (t ? t.nome : '?') + '” è ' + (r.verso === 'al_massimo' ? 'al massimo ' : 'almeno ') +
      num(r.soglia) + ' per ' + r.sessioni + (r.sessioni === 1 ? ' sessione' : ' sessioni consecutive');
  }

  function faseInCorso(programma) {
    var storia = programma.fasi || [];
    var corrente = storia.length ? storia[storia.length - 1] : null;
    return corrente && corrente.pianoId ? fasePianificata(programma, corrente.pianoId) : null;
  }

  // Criterio da usare per un target nella fase: quello della fase, se c'è,
  // altrimenti il criterio di padronanza del target.
  function criterioPerFase(target, fasePiano) {
    if (fasePiano && fasePiano.criteri && fasePiano.criteri[target.id]) return fasePiano.criteri[target.id];
    return target.metodo ? target.metodo.criterio : null;
  }

  // ---- Controlli di coerenza -----------------------------------------------

  /*
   * Avvisi sul piano di un programma. Non bloccano nulla: segnalano ciò che
   * la letteratura e il Codice etico BACB considerano parte di un piano
   * completo. Restituisce [{ livello: 'attenzione' | 'info', testo }].
   */
  // ---- Sicurezza: piano di crisi, consenso, assenso ---------------------------
  var CONSENSO_DA = {
    genitori: 'Genitori',
    tutore: 'Tutore legale',
    paziente: 'Il paziente (maggiorenne)'
  };

  // Programma con le parti di sicurezza sempre presenti (anche se vuote).
  function sicurezzaDi(programma) {
    var x = programma.sicurezza || {};
    return {
      crisi: Object.assign({ segnali: '', passi: '', fine: '', contatti: '' }, x.crisi),
      consenso: Object.assign({ data: '', da: '', restrittive: false, note: '' }, x.consenso),
      assenso: Object.assign({ segni: '', dissenso: '', cosaFare: '' }, x.assenso),
      revisione: x.revisione || ''
    };
  }

  function usaRestrittive(programma) {
    return ((programma.piano && programma.piano.fasi) || []).some(function (f) {
      return (f.contingenze || []).some(function (c) { return PROCEDURE[c.procedura] && PROCEDURE[c.procedura].restrittiva; });
    });
  }

  function controlla(programma) {
    var out = [];
    var targets = programma.target || [];
    var perId = {};
    targets.forEach(function (t) { perId[t.id] = t; });
    var problemi = targets.filter(function (t) { return t.ruolo === 'problema'; });
    var sostitutivi = targets.filter(function (t) { return t.ruolo === 'sostitutivo'; });
    var fasi = programma.piano && programma.piano.fasi ? programma.piano.fasi : [];
    var tutteContingenze = [];
    fasi.forEach(function (f) { (f.contingenze || []).forEach(function (c) { tutteContingenze.push({ fase: f, c: c }); }); });

    problemi.forEach(function (t) {
      if (!t.funzione || !t.funzione.ipotesi || t.funzione.ipotesi === 'da_definire') {
        out.push({ livello: 'attenzione', testo: '“' + t.nome + '”: manca l’ipotesi di funzione. Le procedure di riduzione si scelgono in base alla funzione.' });
      }
    });

    if (problemi.length && !sostitutivi.length) {
      out.push({ livello: 'attenzione', testo: 'Il piano riduce un comportamento ma non insegna un comportamento sostitutivo con la stessa funzione.' });
    }

    sostitutivi.forEach(function (t) {
      if (!t.sostituisce || !perId[t.sostituisce]) {
        out.push({ livello: 'info', testo: '“' + t.nome + '”: indica quale comportamento problema sostituisce.' });
      }
    });

    tutteContingenze.forEach(function (x) {
      var c = x.c, p = c.parametri || {};
      var t = perId[c.targetId];
      var nome = t ? '“' + t.nome + '”' : 'Un target';
      if (PROCEDURE[c.procedura] && PROCEDURE[c.procedura].restrittiva && !(c.motivazione && c.motivazione.trim())) {
        out.push({ livello: 'attenzione', testo: x.fase.nome + ': ' + PROCEDURE[c.procedura].nome.toLowerCase() + ' su ' + nome + ' è una procedura restrittiva. Serve la motivazione scritta e il riferimento alle alternative meno restrittive già provate.' });
      }
      if (c.procedura === 'token' && (!p.tokenPerScambio || !(p.prezzi || []).length)) {
        out.push({ livello: 'attenzione', testo: x.fase.nome + ': il sistema a token su ' + nome + ' deve specificare quanti token servono per lo scambio e il prezzo di ogni rinforzatore.' });
      }
      if (/^(fct|dra|dri)$/.test(c.procedura) && !perId[p.alternativoId]) {
        out.push({ livello: 'attenzione', testo: x.fase.nome + ': scegli il comportamento alternativo da rinforzare per ' + nome + '.' });
      }
      if (c.procedura === 'estinzione' && funzioniDi(t).length) {
        var attese = funzioniDi(t).map(function (k) { return FUNZIONI[k].estinzione; });
        if (p.variante && attese.indexOf(p.variante) === -1) {
          out.push({ livello: 'attenzione', testo: x.fase.nome + ': l’estinzione di ' + nome + ' è per ' + p.variante + ', ma la funzione ipotizzata è ' + descriviFunzione(t).toLowerCase() + '.' });
        }
      }
      if (c.procedura === 'estinzione' && !tutteContingenze.some(function (y) { return y.fase === x.fase && y.c !== c && PROCEDURE[y.c.procedura] && PROCEDURE[y.c.procedura].gruppo !== 'estinzione'; })) {
        out.push({ livello: 'info', testo: x.fase.nome + ': l’estinzione da sola produce spesso un aumento iniziale (burst). Conviene affiancarla a rinforzo differenziale o NCR.' });
      }
    });

    // FCT o DRA con rinforzo continuo senza una fase successiva di assottigliamento.
    var ricchi = tutteContingenze.filter(function (x) {
      return /^(fct|dra)$/.test(x.c.procedura) && x.c.schema && x.c.schema.tipo === 'CRF';
    });
    if (ricchi.length && !fasi.some(function (f) { return f.tipo === 'assottigliamento'; })) {
      out.push({ livello: 'info', testo: 'Il rinforzo dell’alternativa è continuo: pianifica una fase di assottigliamento dello schema prima del mantenimento.' });
    }

    targets.filter(function (t) { return t.ruolo === 'abilita' || t.ruolo === 'sostitutivo'; }).forEach(function (t) {
      var rinforzato = tutteContingenze.some(function (x) {
        return x.c.targetId === t.id || (x.c.parametri && x.c.parametri.alternativoId === t.id);
      });
      if (fasi.length && !rinforzato) {
        out.push({ livello: 'info', testo: '“' + t.nome + '”: nessuna conseguenza programmata nelle fasi del piano.' });
      }
    });

    var sic = sicurezzaDi(programma);
    if (usaRestrittive(programma) && !(sic.consenso.data && sic.consenso.restrittive)) {
      out.push({ livello: 'attenzione', testo: 'Il piano usa procedure restrittive: registra il consenso informato scritto che le comprende (Sicurezza e consenso).' });
    } else if (fasi.length && !sic.consenso.data) {
      out.push({ livello: 'info', testo: 'Manca la data del consenso informato al piano.' });
    }
    if (problemi.length && !sic.crisi.passi.trim()) {
      out.push({ livello: 'info', testo: 'Manca il piano di crisi per i comportamenti pericolosi o che non si possono lasciare in estinzione.' });
    }
    if (fasi.length && !sic.assenso.dissenso.trim()) {
      out.push({ livello: 'info', testo: 'Indica come il paziente mostra assenso e dissenso, e cosa fare quando lo ritira.' });
    }
    return out;
  }

  // ---- Modelli di piano ------------------------------------------------------

  // I dati finti passano un generatore deterministico (vedi creaFasi).
  var generatoreId = null;
  function nuovoId(p) {
    if (generatoreId) return generatoreId(p);
    return root.BR && root.BR.modello ? root.BR.modello.nuovoId(p) : p + '_' + Math.random().toString(36).slice(2, 10);
  }

  var RINFORZATORI_FUNZIONALI = {
    attenzione: { descrizione: 'Attenzione dell’adulto', categoria: 'sociale' },
    fuga: { descrizione: 'Pausa dal compito', categoria: 'pausa', magnitudo: '30 s' },
    tangibile: { descrizione: 'Oggetto richiesto', categoria: 'tangibile', magnitudo: '30 s' },
    automatica: { descrizione: 'Stimolazione equivalente', categoria: 'sensoriale' },
    automatica_negativa: { descrizione: 'Sollievo equivalente', categoria: 'sensoriale' }
  };

  // funzione: una chiave di FUNZIONI oppure un elenco (funzioni sintetizzate,
  // es. pausa con oggetto preferito e attenzione).
  function rinforzatoreFunzionale(funzione) {
    var elenco = (Array.isArray(funzione) ? funzione : [funzione]).filter(function (k) { return RINFORZATORI_FUNZIONALI[k]; });
    var base = { qualita: 'alta', ritardoSec: 0 };
    if (!elenco.length) return Object.assign(base, { descrizione: '', categoria: 'sociale' });
    var primo = RINFORZATORI_FUNZIONALI[elenco[0]];
    if (elenco.length === 1) return Object.assign(base, primo);
    return Object.assign(base, primo, {
      descrizione: elenco.map(function (k, i) { var d = RINFORZATORI_FUNZIONALI[k].descrizione; return i ? d.toLowerCase() : d; }).join(' con ')
    });
  }

  /*
   * Fasi di partenza per un piano. problema e alternativo sono target (o
   * null); funzione è una chiave di FUNZIONI o un elenco di chiavi (funzioni
   * sintetizzate). Il clinico poi modifica tutto.
   */
  var MODELLI = {
    fct: {
      nome: 'FCT con estinzione e assottigliamento',
      descrizione: 'Si insegna una richiesta che produce lo stesso rinforzatore del problema, poi si rende lo schema praticabile.',
      fasi: function (problema, alternativo, funzione) {
        var r = rinforzatoreFunzionale(funzione);
        var prima = Array.isArray(funzione) ? funzione[0] : funzione;
        var ext = FUNZIONI[prima] && FUNZIONI[prima].estinzione;
        function fct(schema) {
          return [
            { id: nuovoId('ct'), targetId: problema && problema.id, procedura: 'fct', schema: schema, rinforzatore: r, parametri: { alternativoId: alternativo && alternativo.id, problema: 'estinzione' } },
            { id: nuovoId('ct'), targetId: problema && problema.id, procedura: 'estinzione', parametri: { variante: ext || '' } }
          ];
        }
        return [
          { id: nuovoId('pf'), tipo: 'baseline', nome: 'Baseline', descrizione: 'Conseguenze abituali, nessuna procedura nuova.', antecedenti: [], contingenze: [], criteri: {} },
          { id: nuovoId('pf'), tipo: 'intervento', nome: 'FCT con rinforzo continuo', descrizione: 'Ogni richiesta è rinforzata subito.', antecedenti: [], contingenze: fct({ tipo: 'CRF' }), criteri: {}, uscita: 'Riduzione del problema dell’80% rispetto alla baseline per 3 sessioni.' },
          { id: nuovoId('pf'), tipo: 'assottigliamento', nome: 'Assottigliamento: schema multiplo', descrizione: 'Si alternano periodi segnalati in cui la richiesta è rinforzata e periodi in cui non lo è, allungando gradualmente i secondi.', antecedenti: [], contingenze: fct({ tipo: 'CRF', segnalato: { sdSec: 60, sdeltaSec: 30, stimoloSd: 'cartellino verde', stimoloSdelta: 'cartellino rosso' } }), criteri: {}, uscita: 'Problema sotto criterio per 2 sessioni a ogni passo.' },
          { id: nuovoId('pf'), tipo: 'mantenimento', nome: 'Mantenimento', descrizione: 'Schema finale con le persone e i luoghi abituali.', antecedenti: [], contingenze: fct({ tipo: 'VI', valore: 120 }), criteri: {} }
        ];
      }
    },
    dra_concorrenti: {
      nome: 'DRA con schemi concorrenti',
      descrizione: 'Il problema resta rinforzato, ma l’alternativa produce un rinforzatore migliore (qualità, quantità, immediatezza). Utile quando l’estinzione non è praticabile.',
      fasi: function (problema, alternativo, funzione) {
        var r = rinforzatoreFunzionale(funzione);
        var basso = Object.assign({}, r, { qualita: 'bassa', magnitudo: 'breve', ritardoSec: 5 });
        return [
          { id: nuovoId('pf'), tipo: 'baseline', nome: 'Baseline', descrizione: '', antecedenti: [], contingenze: [], criteri: {} },
          { id: nuovoId('pf'), tipo: 'intervento', nome: 'DRA concorrente', descrizione: 'Alternativa: rinforzatore di alta qualità, subito. Problema: rinforzatore di bassa qualità, in ritardo.', antecedenti: [], criteri: {},
            contingenze: [{ id: nuovoId('ct'), targetId: problema && problema.id, procedura: 'dra', schema: { tipo: 'CRF' }, rinforzatore: Object.assign({}, r, { magnitudo: 'lungo' }), parametri: { alternativoId: alternativo && alternativo.id, problema: 'rinforzo', schemaProblema: { tipo: 'CRF' }, rinforzatoreProblema: basso } }] },
          { id: nuovoId('pf'), tipo: 'assottigliamento', nome: 'Assottigliamento', descrizione: 'Si aumenta il rapporto per l’alternativa mantenendo il vantaggio sulla qualità.', antecedenti: [], criteri: {},
            contingenze: [{ id: nuovoId('ct'), targetId: problema && problema.id, procedura: 'dra', schema: { tipo: 'FR', valore: 3 }, rinforzatore: r, parametri: { alternativoId: alternativo && alternativo.id, problema: 'estinzione' } }] }
        ];
      }
    },
    dro: {
      nome: 'DRO a intervalli crescenti',
      descrizione: 'Si rinforza l’assenza del comportamento per un intervallo, partendo da poco meno dell’IRT medio in baseline.',
      fasi: function (problema) {
        var r = { descrizione: 'Attività preferita', categoria: 'attivita', magnitudo: '30 s', qualita: 'alta', ritardoSec: 0 };
        function dro(sec) { return [{ id: nuovoId('ct'), targetId: problema && problema.id, procedura: 'dro', rinforzatore: r, parametri: { variante: 'intervallo_fisso', intervalloSec: sec, azzera: true } }]; }
        return [
          { id: nuovoId('pf'), tipo: 'baseline', nome: 'Baseline', descrizione: 'Si misura l’IRT medio per scegliere l’intervallo iniziale.', antecedenti: [], contingenze: [], criteri: {} },
          { id: nuovoId('pf'), tipo: 'intervento', nome: 'DRO 60 s', descrizione: '', antecedenti: [], contingenze: dro(60), criteri: {} },
          { id: nuovoId('pf'), tipo: 'assottigliamento', nome: 'DRO 120 s', descrizione: 'Intervallo raddoppiato dopo 3 sessioni sotto criterio.', antecedenti: [], contingenze: dro(120), criteri: {} },
          { id: nuovoId('pf'), tipo: 'assottigliamento', nome: 'DRO 300 s', descrizione: '', antecedenti: [], contingenze: dro(300), criteri: {} }
        ];
      }
    },
    acquisizione: {
      nome: 'Insegnamento di un’abilità',
      descrizione: 'Rinforzo continuo in acquisizione, poi intermittente in mantenimento e verifica in generalizzazione.',
      fasi: function (problema, alternativo) {
        var r = { descrizione: 'Lode e attività preferita', categoria: 'sociale', qualita: 'alta', ritardoSec: 0 };
        function rp(schema) { return alternativo ? [{ id: nuovoId('ct'), targetId: alternativo.id, procedura: 'rinforzo_positivo', schema: schema, rinforzatore: r, parametri: {} }] : []; }
        return [
          { id: nuovoId('pf'), tipo: 'baseline', nome: 'Baseline', descrizione: 'Prove senza prompt né rinforzo programmato.', antecedenti: [], contingenze: [], criteri: {} },
          { id: nuovoId('pf'), tipo: 'intervento', nome: 'Acquisizione', descrizione: '', antecedenti: [], contingenze: rp({ tipo: 'CRF' }), criteri: {} },
          { id: nuovoId('pf'), tipo: 'mantenimento', nome: 'Mantenimento', descrizione: 'Sondaggi settimanali.', antecedenti: [], contingenze: rp({ tipo: 'VR', valore: 3 }), criteri: {} },
          { id: nuovoId('pf'), tipo: 'generalizzazione', nome: 'Generalizzazione', descrizione: 'Altre persone, luoghi e materiali.', antecedenti: [], contingenze: rp({ tipo: 'VR', valore: 3 }), criteri: {} }
        ];
      }
    }
  };

  // ---- Conseguenze in seduta (telefono) ---------------------------------------
  // Gli eventi di tipo 'conseguenza' registrano cosa l'operatore ha fatto
  // secondo il piano: valore { contingenzaId, procedura, azione }.
  // azione: 'data' (conseguenza consegnata), 'avvio' e 'ferma' (timer di DRO,
  // DRL e schema multiplo), 'rinforzo' (DRO a intervallo intero e DRL, con
  // indice per il DRL a intervalli), 'momento' (DRO momentaneo, con indice e
  // presente), 'errore' (problema rinforzato per errore durante l'estinzione:
  // errore di commissione per la fedeltà del trattamento). Non entrano nel
  // calcolo delle misure.

  // Fattori dell'intervallo variabile: media 1, fissi per riproducibilità.
  var FATTORI_VARIABILE = [0.5, 1.5, 1, 0.75, 1.25, 1];

  // Un evento che segnala il comportamento (per azzerare il DRO).
  function eventoComportamento(e) {
    if (e.tipo === 'occorrenza' || e.tipo === 'inizio' || e.tipo === 'abc') return true;
    return e.tipo === 'intervallo' && e.valore && e.valore.presente;
  }

  function conseguenzeDi(eventi, contingenzaId) {
    return eventi.filter(function (e) { return e.tipo === 'conseguenza' && e.valore && e.valore.contingenzaId === contingenzaId; });
  }

  // Stato del timer DRO di una contingenza, dagli eventi validi del target
  // nella sessione (ordinati per tempo) e dall'ora corrente.
  // Intervallo intero: il comportamento azzera il timer (o fa perdere
  //   l'intervallo, se azzera è falso); a fine intervallo il rinforzo è dovuto
  //   finché l'operatore non lo segna, poi riparte.
  // Momentaneo: griglia fissa dall'avvio; a ogni scadenza si chiede se il
  //   comportamento è presente in quel momento.
  function statoDro(c, eventi, ora) {
    var p = c.parametri || {};
    var base = Math.max(1, +p.intervalloSec || 60) * 1000;
    var variabile = /variabile$/.test(p.variante || '');
    var momentaneo = /^momentaneo/.test(p.variante || '');
    function durata(k) { return variabile ? base * FATTORI_VARIABILE[k % FATTORI_VARIABILE.length] : base; }

    var miei = conseguenzeDi(eventi, c.id);
    var comandi = miei.filter(function (e) { return e.valore.azione === 'avvio' || e.valore.azione === 'ferma'; });
    var rinforziTotali = miei.filter(function (e) {
      return e.valore.azione === 'rinforzo' || (e.valore.azione === 'momento' && !e.valore.presente);
    }).length;
    var avvio = comandi[comandi.length - 1];
    var out = { attivo: false, momentaneo: momentaneo, rinforzi: rinforziTotali, intervalloMs: base };
    if (!avvio || avvio.valore.azione === 'ferma') return out;
    out.attivo = true;
    var dopo = eventi.filter(function (e) { return e.t >= avvio.t && e !== avvio; });

    if (momentaneo) {
      var risposte = {};
      dopo.forEach(function (e) {
        if (e.tipo === 'conseguenza' && e.valore && e.valore.contingenzaId === c.id && e.valore.azione === 'momento') risposte[e.valore.indice] = e.valore.presente;
      });
      var k = 0, fine = avvio.t + durata(0);
      while (fine <= ora) { k++; fine += durata(k); }
      // k = intervallo in corso; l'ultimo concluso è k - 1.
      var concluso = k - 1;
      out.indice = k;
      out.scadenza = fine;
      out.restanteMs = fine - ora;
      out.domanda = concluso >= 0 && !(concluso in risposte) ? concluso : null;
      out.saltati = 0;
      for (var i = 0; i < concluso; i++) if (!(i in risposte)) out.saltati++;
      return out;
    }

    var inizio = avvio.t, j = 0, perso = false, dovuto = false, dovutoDa = null, mancati = 0;
    function avanza(t) {
      while (!dovuto && t >= inizio + durata(j)) {
        if (perso) { inizio += durata(j); j++; perso = false; }
        else { dovuto = true; dovutoDa = inizio + durata(j); }
      }
    }
    dopo.forEach(function (e) {
      avanza(e.t);
      if (eventoComportamento(e)) {
        if (dovuto) { mancati++; dovuto = false; inizio = e.t; j++; perso = false; }
        else if (p.azzera === false) perso = true;
        else inizio = e.t;
      } else if (e.tipo === 'conseguenza' && e.valore && e.valore.contingenzaId === c.id && e.valore.azione === 'rinforzo') {
        dovuto = false; perso = false; inizio = e.t; j++;
      }
    });
    avanza(ora);
    out.indice = j;
    out.dovuto = dovuto;
    out.dovutoDa = dovutoDa;
    out.perso = perso;
    out.mancati = mancati;
    out.inizio = inizio;
    out.scadenza = inizio + durata(j);
    out.restanteMs = dovuto ? 0 : inizio + durata(j) - ora;
    return out;
  }

  // L'avvio del timer di una conseguenza, se a fine eventi il timer è acceso.
  function avvioAttivo(c, eventi) {
    var comandi = conseguenzeDi(eventi, c.id).filter(function (e) { return e.valore.azione === 'avvio' || e.valore.azione === 'ferma'; });
    var ultimo = comandi[comandi.length - 1];
    return ultimo && ultimo.valore.azione === 'avvio' ? ultimo : null;
  }

  function eRinforzoDi(e, c) {
    return e.tipo === 'conseguenza' && e.valore && e.valore.contingenzaId === c.id && e.valore.azione === 'rinforzo';
  }

  /*
   * Timer del DRL (Deitz & Repp, 1973; Austin & Bevan, 2011).
   *   sessione: nessun timer; il rinforzo si dà a fine seduta se il
   *     comportamento non ha superato il limite.
   *   intervalli: dall'avvio la seduta è divisa in intervalli; a fine
   *     intervallo il rinforzo è dovuto se il comportamento è rimasto entro il
   *     limite in quell'intervallo. Il telefono chiede solo dell'ultimo
   *     intervallo concluso; quelli dovuti e non segnati sono saltati.
   *   distanziate: una risposta è rinforzata se arriva almeno intervalloSec
   *     dopo la precedente (o dopo l'avvio). Il rinforzo resta dovuto finché
   *     l'operatore non lo segna; se prima arriva un'altra risposta è mancato.
   * eventi: quelli del comportamento, con le conseguenze registrate.
   */
  function statoDrl(c, eventi, ora) {
    var p = c.parametri || {};
    var variante = VARIANTI.varianteDrl[p.variante] ? p.variante : 'sessione';
    var base = Math.max(1, +p.intervalloSec || 60) * 1000;
    var limite = Math.max(0, +p.limite || 0);
    var rinforzi = conseguenzeDi(eventi, c.id).filter(function (e) { return e.valore.azione === 'rinforzo'; }).length;
    var out = { variante: variante, limite: limite, intervalloMs: base, rinforzi: rinforzi, attivo: false };
    if (variante === 'sessione') {
      out.risposte = eventi.filter(function (e) { return e.t <= ora && eventoComportamento(e); }).length;
      out.entro = out.risposte <= limite;
      return out;
    }
    var avvio = avvioAttivo(c, eventi);
    if (!avvio) return out;
    out.attivo = true;
    out.avvio = avvio.t;
    var dopo = eventi.filter(function (e) { return e.t >= avvio.t && e.t <= ora && e !== avvio; });

    if (variante === 'intervalli') {
      var k = Math.floor((ora - avvio.t) / base);
      var conteggi = [];
      for (var i = 0; i <= k; i++) conteggi.push(0);
      var segnati = {};
      dopo.forEach(function (e) {
        if (eventoComportamento(e)) conteggi[Math.min(Math.floor((e.t - avvio.t) / base), k)]++;
        else if (eRinforzoDi(e, c)) segnati[e.valore.indice] = true;
      });
      var dovuti = [];
      for (var j = 0; j < k; j++) if (conteggi[j] <= limite) dovuti.push(j);
      out.indice = k;
      out.risposte = conteggi[k];
      out.scadenza = avvio.t + (k + 1) * base;
      out.restanteMs = out.scadenza - ora;
      out.conclusi = k;
      out.dovuti = dovuti.length;
      out.segnati = dovuti.filter(function (x) { return segnati[x]; }).length;
      out.domanda = k > 0 && dovuti.indexOf(k - 1) !== -1 && !segnati[k - 1] ? k - 1 : null;
      out.saltati = dovuti.filter(function (x) { return x < k - 1 && !segnati[x]; }).length;
      out.persi = k - dovuti.length;
      return out;
    }

    var prec = avvio.t, dovuto = false, mancati = 0, qualificate = 0;
    dopo.forEach(function (e) {
      if (eventoComportamento(e)) {
        if (dovuto) mancati++;
        dovuto = e.t - prec >= base;
        if (dovuto) qualificate++;
        prec = e.t;
      } else if (eRinforzoDi(e, c)) {
        dovuto = false;
      }
    });
    out.dovuto = dovuto;
    out.qualificate = qualificate;
    out.mancati = mancati;
    out.ultima = prec;
    out.pronto = ora - prec >= base;
    out.scadenza = prec + base;
    out.restanteMs = Math.max(0, prec + base - ora);
    return out;
  }

  /*
   * Schema multiplo segnalato (Hanley, Iwata & Thompson, 2001; Fisher et al.,
   * 2015): dall'avvio del timer si alternano la componente con rinforzo (SD,
   * sdSec secondi) e quella senza (SΔ, sdeltaSec secondi), partendo dall'SD.
   * A ogni cambio il telefono vibra, così l'operatore cambia lo stimolo.
   */
  function statoMultiplo(c, eventi, ora) {
    var s = (c.schema && c.schema.segnalato) || {};
    var sd = Math.max(1, +s.sdSec || 60) * 1000, sdelta = Math.max(1, +s.sdeltaSec || 60) * 1000;
    var out = { attivo: false, sdMs: sd, sdeltaMs: sdelta, stimoloSd: s.stimoloSd || 'SD', stimoloSdelta: s.stimoloSdelta || 'SΔ' };
    var avvio = avvioAttivo(c, eventi);
    if (!avvio) return out;
    var trascorso = Math.max(0, ora - avvio.t), ciclo = sd + sdelta, dentro = trascorso % ciclo;
    out.attivo = true;
    out.avvio = avvio.t;
    out.ciclo = Math.floor(trascorso / ciclo);
    out.componente = dentro < sd ? 'sd' : 'sdelta';
    out.scadenza = ora + (dentro < sd ? sd - dentro : ciclo - dentro);
    out.restanteMs = out.scadenza - ora;
    return out;
  }

  // Componente dello schema multiplo a un istante: 'sd', 'sdelta', oppure
  // null se in quel momento il timer era spento.
  function componenteMultiplo(c, eventi, t) {
    return statoMultiplo(c, eventi.filter(function (e) { return e.t <= t; }), t).componente || null;
  }

  // Quante volte una conseguenza è stata consegnata in seduta (azione 'data',
  // o un'altra azione); targetId limita al target sulla cui scheda è segnata.
  function conteggioConsegne(eventi, contingenzaId, azione, targetId) {
    return conseguenzeDi(eventi, contingenzaId).filter(function (e) {
      return e.valore.azione === (azione || 'data') && (!targetId || e.targetId === targetId);
    }).length;
  }

  function descriviEventoConseguenza(e, contingenza) {
    var v = e.valore || {};
    var nome = contingenza ? siglaContingenza(contingenza) : (v.procedura || 'conseguenza');
    switch (v.azione) {
      case 'avvio': return nome + ': timer avviato';
      case 'ferma': return nome + ': timer fermato';
      case 'rinforzo':
        if (v.procedura === 'drl') return nome + ': rinforzo dato' + (v.indice != null ? ' per l’intervallo ' + (v.indice + 1) : '');
        return nome + ': rinforzo dato a fine intervallo';
      case 'errore': return nome + ': problema rinforzato per errore';
      case 'momento': return nome + ' ' + ((v.indice || 0) + 1) + ': ' + (v.presente ? 'presente, niente rinforzo' : 'assente, rinforzo dato');
      default: return nome + ': conseguenza data';
    }
  }

  // ---- Valutazione delle preferenze -------------------------------------------
  // Ogni metodo dice cosa misura il numero inserito per ogni stimolo e in che
  // verso si ordina (per l'MSWO il rango medio: 1 = scelto per primo).
  var METODI_PREFERENZA = {
    paired: { nome: 'Scelta a coppie', fonte: 'Fisher et al., 1992', misura: '% di scelte', massimo: 100, crescente: false,
      aiuto: 'Ogni stimolo è presentato in coppia con ognuno degli altri; conta quante volte è scelto sul totale delle volte in cui è presentato.' },
    mswo: { nome: 'Scelta multipla senza sostituzione (MSWO)', fonte: 'DeLeon & Iwata, 1996', misura: 'rango medio', crescente: true,
      aiuto: 'Tutti gli stimoli insieme; quello scelto si toglie e si ripresenta il resto. Inserisci il rango medio su 3–5 somministrazioni (1 = scelto per primo).' },
    singolo: { nome: 'Stimolo singolo', fonte: 'Pace et al., 1985', misura: '% di prove con approccio', massimo: 100, crescente: false,
      aiuto: 'Uno stimolo per volta; conta in quante prove la persona si avvicina o lo prende. Utile quando la scelta tra due è difficile.' },
    free_operant: { nome: 'Operante libero', fonte: 'Roane et al., 1998', misura: '% del tempo di contatto', massimo: 100, crescente: false,
      aiuto: 'Tutti gli stimoli disponibili per 5 minuti senza toglierli; misura il tempo con ciascuno. Riduce i comportamenti problema legati alla rimozione.' }
  };

  // Giorni dopo i quali una valutazione si considera da rifare.
  var PREFERENZE_SCADENZA_GIORNI = 30;

  // Stimoli ordinati dal più al meno preferito, con un livello indicativo
  // (alta, media, bassa) in terzi della scala del metodo.
  function classificaPreferenze(v) {
    var m = METODI_PREFERENZA[v && v.metodo];
    if (!m) return [];
    var validi = (v.stimoli || []).filter(function (x) { return x && x.nome && isFinite(x.valore) && x.valore !== null && x.valore !== ''; });
    var n = validi.length;
    var ordinati = validi.slice().sort(function (a, b) { return m.crescente ? a.valore - b.valore : b.valore - a.valore; });
    return ordinati.map(function (x, i) {
      // Punteggio da 0 a 1, dove 1 = massima preferenza.
      var p = m.crescente ? (n > 1 ? (n - x.valore) / (n - 1) : 1) : x.valore / m.massimo;
      p = Math.max(0, Math.min(1, p));
      return { nome: x.nome, valore: +x.valore, posizione: i + 1, punteggio: p, livello: p >= 2 / 3 ? 'alta' : p >= 1 / 3 ? 'media' : 'bassa' };
    });
  }

  // Valutazione più recente di un soggetto (o null).
  function ultimaPreferenza(soggetto) {
    var el = (soggetto && soggetto.preferenze) || [];
    return el.slice().sort(function (a, b) { return a.data < b.data ? 1 : a.data > b.data ? -1 : 0; })[0] || null;
  }

  // Nomi suggeriti per i rinforzatori: gli stimoli della valutazione più
  // recente in ordine di preferenza, e se la valutazione è da rifare.
  function suggerimentiRinforzatori(soggetto, oggi) {
    var v = ultimaPreferenza(soggetto);
    if (!v) return { valutazione: null, stimoli: [], scaduta: false, giorni: null };
    var giorni = Math.floor(((oggi ? new Date(oggi) : new Date()) - new Date(v.data)) / 86400000);
    return { valutazione: v, stimoli: classificaPreferenze(v), scaduta: giorni > PREFERENZE_SCADENZA_GIORNI, giorni: giorni };
  }

  // Fasi di un modello per i target scelti. idFn è facoltativo.
  function creaFasi(chiave, problema, alternativo, funzione, idFn) {
    generatoreId = idFn || null;
    try { return MODELLI[chiave].fasi(problema, alternativo, funzione); }
    finally { generatoreId = null; }
  }

  var api = {
    RUOLI: RUOLI, FUNZIONI: FUNZIONI, funzioniDi: funzioniDi, descriviFunzione: descriviFunzione,
    rinforzatoreFunzionale: rinforzatoreFunzionale, FONTI_VALUTAZIONE: FONTI_VALUTAZIONE, CERTEZZA: CERTEZZA,
    SCHEMI: SCHEMI, CATEGORIE_RINFORZATORE: CATEGORIE_RINFORZATORE, QUALITA: QUALITA,
    PROCEDURE: PROCEDURE, GRUPPI: GRUPPI, VARIANTI: VARIANTI, ANTECEDENTI: ANTECEDENTI,
    FORMATI: FORMATI, STRATEGIE_PROMPT: STRATEGIE_PROMPT, CORREZIONI: CORREZIONI, FASI: FASI,
    MODELLI: MODELLI, creaFasi: creaFasi,
    descriviSchema: descriviSchema, descriviRinforzatore: descriviRinforzatore,
    descriviContingenza: descriviContingenza, siglaContingenza: siglaContingenza,
    descriviAntecedente: descriviAntecedente, leggiPrezzi: leggiPrezzi, scriviPrezzi: scriviPrezzi, schemiConcorrenti: schemiConcorrenti,
    obiettivo: obiettivo, fasePianificata: fasePianificata, nomeFase: nomeFase,
    prossimaFase: prossimaFase, faseInCorso: faseInCorso, criterioPerFase: criterioPerFase,
    fasePrecedente: fasePrecedente, valutaRegole: valutaRegole, descriviRitorno: descriviRitorno,
    METODI_PREFERENZA: METODI_PREFERENZA, PREFERENZE_SCADENZA_GIORNI: PREFERENZE_SCADENZA_GIORNI,
    classificaPreferenze: classificaPreferenze, ultimaPreferenza: ultimaPreferenza, suggerimentiRinforzatori: suggerimentiRinforzatori,
    eventoComportamento: eventoComportamento, statoDro: statoDro, statoDrl: statoDrl,
    statoMultiplo: statoMultiplo, componenteMultiplo: componenteMultiplo, conteggioConsegne: conteggioConsegne,
    descriviEventoConseguenza: descriviEventoConseguenza,
    CONSENSO_DA: CONSENSO_DA, sicurezzaDi: sicurezzaDi, usaRestrittive: usaRestrittive,
    controlla: controlla
  };

  root.BR = root.BR || {};
  root.BR.piano = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
