/*
 * Dati finti per i prototipi: 3 pazienti clinici con programmi che coprono
 * le misure principali, sessioni passate e i relativi eventi grezzi.
 * Il generatore è deterministico (seme fisso), così i grafici sono sempre
 * gli stessi a parità di data di riferimento.
 * Tutti i nomi e i codici sono inventati.
 */
(function (root) {
  'use strict';
  if (!root.BR || !root.BR.seduta) { if (typeof module !== 'undefined' && module.exports) { require('./modello.js'); require('./seduta.js'); } }

  var M = root.BR && root.BR.modello ? root.BR.modello : require('./modello.js');
  var P = root.BR && root.BR.piano ? root.BR.piano : require('./piano.js');

  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Giorni di seduta (lun, mer, ven) prima di oggi, i più recenti in fondo.
  function giorniDiSeduta(oggi, quanti) {
    var out = [];
    var d = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate());
    while (out.length < quanti) {
      d.setDate(d.getDate() - 1);
      var g = d.getDay();
      if (g === 1 || g === 3 || g === 5) out.unshift(new Date(d));
    }
    return out;
  }

  function dataISO(d) {
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var g = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + g;
  }

  function limita(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // Interpolazione lineare tra a e b lungo la fase, più rumore.
  function andamento(rnd, a, b, rumore) {
    return function (k, n) {
      var f = n > 1 ? k / (n - 1) : 1;
      return a + (b - a) * f + (rnd() * 2 - 1) * rumore;
    };
  }

  function genera(oggiInput) {
    var oggi = oggiInput ? new Date(oggiInput) : new Date();
    var rnd = mulberry32(20261013);
    var rndC = mulberry32(13102026);
    var contatore = 0;
    function id(p) { contatore++; return p + '_' + String(contatore).padStart(5, '0'); }

    var operatori = [
      { id: 'op_andrea', nome: 'Andrea', ruolo: 'supervisore' },
      { id: 'op_giulia', nome: 'Giulia R.', ruolo: 'terapista' },
      { id: 'op_marco', nome: 'Marco D.', ruolo: 'terapista' }
    ];

    var definizioni = {
      colpire: {
        include: 'Contatto forzato di mano, piede o oggetto lanciato con il corpo di un’altra persona.',
        esclude: 'Contatti accidentali durante il gioco motorio; toccare per chiamare.',
        esempi: 'Schiaffo, calcio, lancio di una costruzione verso l’operatore.',
        inizio: 'Contatto con il corpo dell’altra persona.',
        fine: 'Evento istantaneo: due colpi separati da meno di 1 secondo contano come uno.'
      },
      pianto: {
        include: 'Pianto o urla udibili da 3 metri, per almeno 3 secondi. Fine dopo 5 secondi di silenzio.',
        esclude: 'Lamenti brevi sotto i 3 secondi.',
        esempi: 'Pianto dopo la richiesta di riordinare.'
      },
      pausa: {
        include: 'Dice “pausa” o consegna la carta PAUSA durante un compito, senza comportamento problema nei 5 secondi precedenti.',
        esclude: 'Richiesta fatta mentre colpisce o piange.',
        esempi: 'Porge la carta dopo tre richieste di riordino.',
        inizio: 'La carta tocca la mano dell’adulto o la parola è udibile.',
        fine: 'Evento istantaneo.'
      },
      aiuto: {
        include: 'Il bambino dice “aiuto” o porge l’oggetto all’adulto entro 5 secondi dall’occasione.',
        esclude: 'Richiesta dopo un comportamento problema.',
        esempi: 'Barattolo chiuso, scarpa da allacciare, puzzle bloccato.'
      },
      attenzione: {
        include: 'Sguardo rivolto al materiale o all’insegnante, mani sul compito.',
        esclude: 'Sguardo altrove per più di 2 secondi.',
        esempi: 'Scheda di pregrafismo, ascolto della consegna.'
      },
      alzarsi: {
        include: 'Glutei staccati dalla sedia senza permesso.',
        esclude: 'Alzarsi su richiesta dell’insegnante.',
        esempi: 'Si alza per andare alla finestra durante la scheda.'
      },
      mani: {
        include: 'Esecuzione del passo senza aiuto entro 5 secondi dal passo precedente.',
        esclude: 'Passo eseguito dopo un prompt.',
        esempi: 'Routine del bagno prima della merenda.'
      },
      imitazione: {
        include: 'Riproduce il movimento del modello entro 3 secondi, con forma riconoscibile.',
        esclude: 'Movimento diverso o oltre i 3 secondi.',
        esempi: 'Battere le mani, toccare la testa, alzare le braccia.'
      },
      stereotipie: {
        include: 'Vocalizzazioni non comunicative ripetute (sillabe, versi) al momento del campione.',
        esclude: 'Parole o richieste comunicative.',
        esempi: '“Ba-ba-ba” ripetuto durante il gioco libero.'
      },
      nome: {
        include: 'Orienta lo sguardo verso chi lo chiama dopo il nome detto una volta.',
        esclude: 'Orientamento dopo una seconda chiamata.',
        esempi: 'Nome detto a 2 metri durante un gioco preferito.'
      }
    };

    function crit(soglia, verso) { return { soglia: soglia, verso: verso, sessioni: 3 }; }

    // extra: ruolo, funzione, sostituisce, obiettivo, insegnamento, generalizzazione.
    function target(nome, direzione, tipo, parametri, criterio, def, profili, extra) {
      var base = JSON.parse(JSON.stringify(M.TIPI[tipo].parametri));
      Object.keys(parametri || {}).forEach(function (k) { base[k] = parametri[k]; });
      var t = {
        id: id('tg'),
        nome: nome,
        direzione: direzione,
        ruolo: direzione === 'ridurre' ? 'problema' : 'abilita',
        definizione: Object.assign({ inizio: '', fine: '' }, def),
        metodo: { id: id('me'), tipo: tipo, versione: 1, parametri: base, criterio: criterio },
        _profili: profili
      };
      Object.keys(extra || {}).forEach(function (k) { t[k] = extra[k]; });
      return t;
    }

    function insegnamento(formato, istruzione, materiali, strategia, ritardoSec, correzione) {
      return {
        formato: formato, istruzione: istruzione, materiali: materiali,
        prompt: { strategia: strategia, ritardoSec: ritardoSec || 0, sfumatura: 'Si passa al livello meno intrusivo dopo 2 sessioni con almeno l’80% di risposte al livello in corso.' },
        correzione: correzione, rinforzoDifferenziale: true
      };
    }

    function generalizzazione(persone, luoghi, materiali) {
      return { persone: persone, luoghi: luoghi, materiali: materiali };
    }

    // Collega le fasi svolte (baseline, intervento) alle prime due fasi del piano.
    function conPiano(pr, modello, problema, alternativo, funzione) {
      pr.piano = { modello: modello, fasi: P.creaFasi(modello, problema, alternativo, funzione, id) };
      return pr;
    }

    // ---- Pazienti -------------------------------------------------------
    var soggetti = [];
    function giorniPrima(n) { var d = new Date(oggi); d.setDate(d.getDate() - n); return dataISO(d); }
    function stimoli(coppie) { return coppie.map(function (c) { return { nome: c[0], valore: c[1] }; }); }
    var piani = []; // { soggetto, sessioni: n, ora, operatori, durataMin }

    // PZ-014
    var p1aggr = {
      id: id('pr'), nome: 'Ridurre l’aggressività', area: 'ridurre', stato: 'attivo',
      fasi: [], target: []
    };
    var funzioneFuga = {
      ipotesi: 'fuga', altre: ['tangibile'], sintetizzata: true, fonti: ['indiretta', 'descrittiva', 'iisca'], certezza: 'confermata',
      note: 'Nelle schede ABC il 70% degli episodi segue una richiesta di compito e termina con il compito rimosso, spesso con accesso al tablet. IISCA del 15/09: tassi alti solo nella condizione di test (richieste e tablet tolto), zero nel controllo.'
    };
    var colpire = target('Colpire gli altri', 'ridurre', 'frequenza', {}, crit(0.1, 'al_massimo'), definizioni.colpire,
      { baseline: andamento(rnd, 0.6, 0.65, 0.12), intervento: andamento(rnd, 0.45, 0.14, 0.06) },
      { funzione: funzioneFuga, obiettivo: { condizione: 'durante il lavoro al tavolo con richieste di compito' } });
    p1aggr.target.push(colpire);
    var pausa = target('Chiede una pausa', 'aumentare', 'frequenza', {}, crit(0.3, 'almeno'), definizioni.pausa,
      { baseline: andamento(rnd, 0.02, 0.03, 0.02), intervento: andamento(rnd, 0.15, 0.45, 0.05) },
      {
        ruolo: 'sostitutivo', sostituisce: colpire.id,
        obiettivo: { condizione: 'durante il lavoro al tavolo, quando riceve una richiesta' },
        insegnamento: insegnamento('net', 'Nessuna istruzione: l’occasione è la richiesta di compito.', 'Carta PAUSA sul tavolo', 'ritardo_progressivo', 2, 'ripresenta_prompt'),
        generalizzazione: generalizzazione(['Giulia R.', 'Andrea', 'Genitori'], ['Studio', 'Casa'], ['Carta PAUSA', 'Parola “pausa”'])
      });
    p1aggr.target.push(pausa);
    p1aggr.target.push(target('Crisi di pianto', 'ridurre', 'durata', {}, crit(1, 'al_massimo'), definizioni.pianto,
      { baseline: andamento(rnd, 6, 6.5, 1.2), intervento: andamento(rnd, 5, 1.4, 0.6) },
      { funzione: funzioneFuga }));
    p1aggr.target.push(target('Episodi aggressivi (ABC)', 'ridurre', 'abc',
      { comportamenti: ['Colpire', 'Lanciare oggetti', 'Spingere'] }, null,
      { include: 'Ogni episodio di aggressività, registrato con antecedente e conseguenza.', esclude: '', esempi: '' },
      { baseline: andamento(rnd, 3, 3, 1), intervento: andamento(rnd, 2.5, 0.8, 0.6) },
      { ruolo: 'valutazione' }));
    conPiano(p1aggr, 'fct', colpire, pausa, ['fuga', 'tangibile']);
    // Assottigliamento: criterio più stretto e ritorno all'FCT continua se il problema risale.
    p1aggr.piano.fasi[2].criteri[colpire.id] = { verso: 'al_massimo', soglia: 0.15, sessioni: 2 };
    p1aggr.piano.fasi[2].ritorno = { targetId: colpire.id, verso: 'almeno', soglia: 0.4, sessioni: 2 };
    p1aggr.piano.fasi[1].antecedenti = [{ id: id('an'), tipo: 'alta_probabilita', richieste: 3, dettaglio: 'Tre richieste motorie facili prima di ogni compito al tavolo.' }];
    p1aggr._cambio = 6;

    var p1aiuto = {
      id: id('pr'), nome: 'Chiedere aiuto', area: 'insegnare', stato: 'attivo', fasi: [], target: []
    };
    var aiuto = target('Chiede aiuto', 'aumentare', 'dtt', { prove: 10 }, crit(80, 'almeno'), definizioni.aiuto,
      { baseline: andamento(rnd, 10, 15, 6), intervento: andamento(rnd, 30, 92, 5) },
      {
        obiettivo: { condizione: 'davanti a un barattolo chiuso o a un gioco bloccato, senza istruzione' },
        insegnamento: insegnamento('dtt', 'Occasione organizzata: oggetto preferito in un barattolo che non sa aprire.', 'Barattoli, scatole con chiusura, puzzle', 'ritardo_costante', 3, 'ripresenta_prompt'),
        generalizzazione: generalizzazione(['Giulia R.', 'Andrea'], ['Studio', 'Sala d’attesa'], ['Barattoli', 'Zaino', 'Scarpe'])
      });
    p1aiuto.target.push(aiuto);
    conPiano(p1aiuto, 'acquisizione', null, aiuto);
    p1aiuto._cambio = 5;

    p1aggr.sicurezza = {
      consenso: { data: giorniPrima(40), da: 'genitori', restrittive: false, note: 'Piano spiegato a entrambi i genitori; copia firmata in cartella.' },
      assenso: { segni: 'Si siede al tavolo e prende il materiale', dissenso: 'Si gira, copre il viso con le mani, dice “basta”', cosaFare: 'Pausa con un gioco scelto da lui, poi si riprova con una richiesta più facile' },
      crisi: { segnali: 'Colpi ripetuti verso le persone che non si fermano con il blocco', passi: 'Allontanare gli altri, togliere gli oggetti che si possono lanciare, restare a un braccio di distanza, parlare poco e con voce calma. Nessuna richiesta finché non è finita.', fine: '2 minuti senza colpi e respiro tranquillo', contatti: 'Supervisore e genitore nella stessa giornata' },
      revisione: giorniPrima(-50)
    };

    soggetti.push({
      id: id('sg'), codice: 'PZ-014', iniziali: 'L.M.', annoNascita: 2018,
      note: 'Diagnosi ASD livello 2. Sedute in studio, 3 volte a settimana.',
      operatori: ['op_andrea', 'op_giulia'],
      programmi: [p1aggr, p1aiuto],
      preferenze: [
        { id: id('vp'), data: giorniPrima(60), metodo: 'mswo', operatore: 'op_andrea', note: 'Prima valutazione, 3 somministrazioni.',
          stimoli: stimoli([['Tablet con video', 1.3], ['Bolle di sapone', 2], ['Macchinine', 3.3], ['Puzzle', 3.7], ['Libro sonoro', 4.7]]) },
        { id: id('vp'), data: giorniPrima(12), metodo: 'paired', operatore: 'op_giulia', note: 'Le bolle superano il tablet rispetto a due mesi fa.',
          stimoli: stimoli([['Bolle di sapone', 88], ['Tablet con video', 75], ['Macchinine', 50], ['Puzzle', 38], ['Libro sonoro', 12]]) }
      ]
    });
    piani.push({ sessioni: 18, ora: 9, operatori: ['op_giulia', 'op_giulia', 'op_andrea'], durataMin: 30 });

    // PZ-022
    var p2classe = {
      id: id('pr'), nome: 'Autonomia al banco', area: 'insegnare', stato: 'attivo', fasi: [], target: []
    };
    var alzarsi = target('Alzarsi dal banco', 'ridurre', 'intervallo_parziale',
      { intervalloSec: 10, osservazioneMin: 5 }, crit(10, 'al_massimo'), definizioni.alzarsi,
      { baseline: andamento(rnd, 48, 52, 7), intervento: andamento(rnd, 40, 18, 5) },
      {
        funzione: { ipotesi: 'attenzione', fonti: ['indiretta', 'descrittiva'], certezza: 'probabile', note: 'L’insegnante richiama ogni volta; quando l’adulto è vicino il comportamento cala.' },
        obiettivo: { condizione: 'durante le schede individuali in classe' }
      });
    var attenzione = target('Attenzione al compito', 'aumentare', 'intervallo_totale',
      { intervalloSec: 10, osservazioneMin: 5 }, crit(80, 'almeno'), definizioni.attenzione,
      { baseline: andamento(rnd, 28, 32, 6), intervento: andamento(rnd, 40, 68, 6) },
      {
        ruolo: 'sostitutivo', sostituisce: alzarsi.id,
        obiettivo: { condizione: 'durante le schede individuali in classe' },
        generalizzazione: generalizzazione(['Insegnante di sostegno', 'Insegnante di classe'], ['Aula', 'Laboratorio'], ['Schede', 'Quaderno'])
      });
    p2classe.target.push(attenzione, alzarsi);
    var menuToken = [
      { descrizione: 'Due minuti di gioco con l’insegnante', costo: 5 },
      { descrizione: 'Adesivo', costo: 3 },
      { descrizione: 'Scegliere il gioco dell’intervallo', costo: 8 }
    ];
    var lode = { descrizione: 'Lode descrittiva e vicinanza dell’adulto', categoria: 'sociale', qualita: 'alta', ritardoSec: 0 };
    p2classe.piano = {
      modello: null,
      fasi: [
        { id: id('pf'), tipo: 'baseline', nome: 'Baseline', descrizione: 'Richiami abituali dell’insegnante.', antecedenti: [], contingenze: [], criteri: {} },
        {
          id: id('pf'), tipo: 'intervento', nome: 'DRI con token', descrizione: 'Attenzione al compito rinforzata con token; alzarsi non riceve più richiami.',
          antecedenti: [{ id: id('an'), tipo: 'agenda_visiva', dettaglio: 'Agenda della mattina sul banco, con la pausa indicata.' }],
          contingenze: [
            { id: id('ct'), targetId: attenzione.id, procedura: 'token', schema: { tipo: 'FI', valore: 60 }, parametri: { tokenPerScambio: 5, prezzi: menuToken } },
            { id: id('ct'), targetId: alzarsi.id, procedura: 'dri', schema: { tipo: 'FI', valore: 60 }, rinforzatore: lode, parametri: { alternativoId: attenzione.id, problema: 'estinzione' } },
            { id: id('ct'), targetId: alzarsi.id, procedura: 'estinzione', parametri: { variante: 'attenzione' } }
          ],
          criteri: {}, uscita: 'Alzarsi al massimo nel 10% degli intervalli per 3 sessioni.', stalloSessioni: 10
        },
        {
          id: id('pf'), tipo: 'assottigliamento', nome: 'Token ogni 3 minuti', descrizione: '', antecedenti: [],
          contingenze: [
            { id: id('ct'), targetId: attenzione.id, procedura: 'token', schema: { tipo: 'VI', valore: 180 }, parametri: { tokenPerScambio: 5, prezzi: menuToken } },
            { id: id('ct'), targetId: alzarsi.id, procedura: 'estinzione', parametri: { variante: 'attenzione' } }
          ],
          criteri: {}
        }
      ]
    };
    p2classe._cambio = 6;

    var p2mani = {
      id: id('pr'), nome: 'Lavarsi le mani', area: 'insegnare', stato: 'attivo', fasi: [], target: []
    };
    var mani = target('Routine lavaggio mani', 'aumentare', 'task_analysis',
      { passi: ['Aprire l’acqua', 'Bagnare le mani', 'Prendere il sapone', 'Strofinare 10 secondi', 'Sciacquare', 'Asciugare'] },
      crit(80, 'almeno'), definizioni.mani,
      { baseline: andamento(rnd, 17, 17, 4), intervento: andamento(rnd, 33, 67, 6) },
      {
        obiettivo: { condizione: 'prima della merenda, al lavandino della scuola, con l’istruzione “lava le mani”' },
        insegnamento: insegnamento('catena_indietro', '“Lava le mani”', 'Sapone a pompa, asciugamano di carta', 'meno_intrusivo', 0, 'ripresenta_prompt'),
        generalizzazione: generalizzazione(['Insegnante di sostegno', 'Genitori'], ['Bagno della scuola', 'Casa'], ['Sapone a pompa', 'Saponetta'])
      });
    p2mani.target.push(mani);
    conPiano(p2mani, 'acquisizione', null, mani);
    p2mani._cambio = 4;

    p2classe.sicurezza = {
      consenso: { data: giorniPrima(50), da: 'genitori', restrittive: false, note: 'Consenso anche della scuola per le osservazioni in classe.' },
      assenso: { segni: '', dissenso: '', cosaFare: '' },
      crisi: {}
    };

    soggetti.push({
      id: id('sg'), codice: 'PZ-022', iniziali: 'G.F.', annoNascita: 2016,
      note: 'Sedute a scuola con l’insegnante di sostegno presente.',
      operatori: ['op_andrea', 'op_marco'],
      programmi: [p2classe, p2mani],
      preferenze: [
        { id: id('vp'), data: giorniPrima(45), metodo: 'free_operant', operatore: 'op_marco', note: 'In classe, 5 minuti durante l’intervallo.',
          stimoli: stimoli([['Gioco con l’insegnante', 46], ['Adesivi', 24], ['Disegno', 18], ['Costruzioni', 8], ['Libro', 4]]) }
      ]
    });
    piani.push({ sessioni: 18, ora: 11, operatori: ['op_marco'], durataMin: 30 });

    // PZ-031
    var p3imit = {
      id: id('pr'), nome: 'Imitazione motoria', area: 'insegnare', stato: 'attivo', fasi: [], target: []
    };
    var imita = target('Imita azioni con il corpo', 'aumentare', 'dtt', { prove: 10 }, Object.assign(crit(80, 'almeno'), { minOperatori: 2 }), definizioni.imitazione,
      { baseline: andamento(rnd, 20, 20, 8), intervento: andamento(rnd, 30, 62, 7) },
      {
        obiettivo: { condizione: 'al tavolo, con l’istruzione “fai così” e il modello dell’adulto' },
        insegnamento: insegnamento('dtt', '“Fai così” più il modello', 'Nessuno', 'meno_intrusivo', 0, 'errorless'),
        generalizzazione: generalizzazione(['Giulia R.', 'Andrea'], ['Studio', 'Palestra'], ['Azioni nuove non insegnate'])
      });
    p3imit.target.push(imita);
    conPiano(p3imit, 'acquisizione', null, imita);
    p3imit._cambio = 4;

    var p3stereo = {
      id: id('pr'), nome: 'Ridurre le stereotipie vocali', area: 'ridurre', stato: 'attivo', fasi: [], target: []
    };
    var stereo = target('Vocalizzazioni ripetitive', 'ridurre', 'momentaneo',
      { intervalloSec: 30, osservazioneMin: 10 }, crit(15, 'al_massimo'), definizioni.stereotipie,
      { baseline: andamento(rnd, 60, 62, 7), intervento: andamento(rnd, 50, 32, 7) },
      {
        funzione: { ipotesi: 'automatica', fonti: ['analisi_funzionale'], certezza: 'confermata', note: 'Livelli alti e stabili anche nella condizione da solo.' },
        obiettivo: { condizione: 'durante il gioco libero in studio' }
      });
    p3stereo.target.push(stereo);
    p3stereo.piano = {
      modello: null,
      fasi: [
        { id: id('pf'), tipo: 'baseline', nome: 'Baseline', descrizione: '', antecedenti: [], contingenze: [], criteri: {} },
        {
          id: id('pf'), tipo: 'intervento', nome: 'NCR musicale e DRO momentaneo', descrizione: 'Accesso libero a stimolazione uditiva in competizione, più rinforzo dell’assenza di vocalizzazioni.',
          antecedenti: [{ id: id('an'), tipo: 'ncr', schema: { tipo: 'FT', valore: 60 }, rinforzatore: { descrizione: 'Canzoncina preferita in cuffia', categoria: 'sensoriale', magnitudo: '20 s', qualita: 'alta', ritardoSec: 0 }, dettaglio: '' }],
          contingenze: [{ id: id('ct'), targetId: stereo.id, procedura: 'dro', rinforzatore: { descrizione: 'Bolle di sapone', categoria: 'sensoriale', magnitudo: '10 s', qualita: 'alta', ritardoSec: 0 }, parametri: { variante: 'momentaneo_fisso', intervalloSec: 30, azzera: false } }],
          criteri: {}
        }
      ]
    };
    p3stereo._cambio = 4;

    var p3nome = {
      id: id('pr'), nome: 'Risposta al nome', area: 'insegnare', stato: 'attivo', fasi: [], target: []
    };
    var nome = target('Si gira quando chiamato', 'ridurre', 'latenza', {}, crit(3, 'al_massimo'), definizioni.nome,
      { baseline: andamento(rnd, 6.5, 6, 1), intervento: andamento(rnd, 5, 2.6, 0.5) },
      {
        ruolo: 'abilita',
        obiettivo: { condizione: 'quando viene chiamato una volta a 2 metri durante un gioco' },
        insegnamento: insegnamento('net', 'Nome detto una volta, voce normale', 'Giochi preferiti', 'piu_intrusivo', 0, 'modello_ripeti'),
        generalizzazione: generalizzazione(['Genitori', 'Giulia R.'], ['Studio', 'Casa'], [])
      });
    p3nome.target.push(nome);
    conPiano(p3nome, 'acquisizione', null, nome);
    p3nome._cambio = 5;

    p3stereo.sicurezza = {
      consenso: { data: giorniPrima(30), da: 'tutore', restrittive: false, note: '' },
      assenso: { segni: 'Sorride, si avvicina all’operatore', dissenso: 'Si allontana verso la porta, piange', cosaFare: 'Si interrompe la prova e si offre la trottola; si riprende quando torna vicino' },
      crisi: {}
    };

    soggetti.push({
      id: id('sg'), codice: 'PZ-031', iniziali: 'S.B.', annoNascita: 2019,
      note: 'Presa in carico da settembre. Sedute in studio.',
      operatori: ['op_andrea', 'op_giulia'],
      programmi: [p3imit, p3stereo, p3nome],
      preferenze: [
        { id: id('vp'), data: giorniPrima(8), metodo: 'singolo', operatore: 'op_giulia', note: 'Scelta tra due ancora difficile: valutazione a stimolo singolo.',
          stimoli: stimoli([['Trottola luminosa', 100], ['Musica dal telefono', 90], ['Solletico', 70], ['Palla morbida', 40], ['Crema sulle mani', 10]]) }
      ]
    });
    piani.push({ sessioni: 12, ora: 15, operatori: ['op_giulia', 'op_andrea'], durataMin: 30 });

    // ---- Sessioni ed eventi ---------------------------------------------
    var sessioni = [];
    var eventi = [];

    soggetti.forEach(function (s, si) {
      var piano = piani[si];
      var giorni = giorniDiSeduta(oggi, piano.sessioni);

      // Fasi: baseline dalla prima seduta, intervento dalla seduta del cambio.
      s.programmi.forEach(function (pr) {
        var pf = pr.piano.fasi;
        pr.fasi = [
          { id: id('fa'), tipo: 'baseline', inizio: dataISO(giorni[0]), nota: 'Osservazione iniziale', pianoId: pf[0].id },
          { id: id('fa'), tipo: pf[1].tipo, inizio: dataISO(giorni[pr._cambio]), nota: 'Avvio del trattamento', pianoId: pf[1].id }
        ];
      });

      s.schedule = {
        id: id('sc'), nome: 'Seduta standard', durataMin: piano.durataMin,
        setting: si === 1 ? 'Aula, banco singolo' : 'Studio, stanza 2',
        voci: s.programmi.reduce(function (acc, pr) {
          return acc.concat(pr.target.map(function (t) { return { targetId: t.id }; }));
        }, [])
      };

      giorni.forEach(function (giorno, k) {
        var inizio = new Date(giorno);
        inizio.setHours(piano.ora, Math.floor(rnd() * 10), 0, 0);
        var S = inizio.getTime();
        var durMin = piano.durataMin - 2 + Math.round(rnd() * 4);
        var F = S + durMin * 60000;
        var sess = {
          id: id('se'), soggettoId: s.id, scheduleId: s.schedule.id,
          operatoreId: piano.operatori[k % piano.operatori.length],
          inizio: S, fine: F, stato: 'chiusa', sincronizzata: true,
          setting: s.schedule.setting, fasi: {}, fasiId: {}, versioniMetodi: {}, nota: ''
        };
        sessioni.push(sess);

        s.programmi.forEach(function (pr) {
          var inIntervento = k >= pr._cambio;
          var voce = pr.fasi[inIntervento ? 1 : 0];
          sess.fasi[pr.id] = voce.tipo;
          sess.fasiId[pr.id] = voce.id;
          var kFase = inIntervento ? k - pr._cambio : k;
          var nFase = inIntervento ? piano.sessioni - pr._cambio : pr._cambio;
          var da = eventi.length;
          pr.target.forEach(function (t) {
            sess.versioniMetodi[t.metodo.id] = 1;
            var v = t._profili[inIntervento ? 'intervento' : 'baseline'](kFase, nFase);
            generaEventi(t, v, sess, S, durMin, function (e) { eventi.push(e); });
          });
          var fasePiano = pr.piano.fasi.find(function (f) { return f.id === voce.pianoId; });
          if (inIntervento && fasePiano) generaConseguenze(fasePiano, sess, eventi.slice(da), function (e) { eventi.push(e); });
        });
      });
    });

    // Conseguenze segnate in seduta, con qualche errore di applicazione, così
    // il desktop mostra la fedeltà del trattamento. Generatore a parte (rndC),
    // per non cambiare gli altri dati finti.
    function generaConseguenze(fase, sess, ev, push) {
      var annullati = {};
      ev.forEach(function (e) { if (e.tipo === 'annulla') annullati[e.rif] = true; });
      var validi = ev.filter(function (e) { return e.tipo !== 'annulla' && !annullati[e.id]; });
      (fase.contingenze || []).forEach(function (c) {
        var p = c.parametri || {};
        function segna(targetId, istante, azione) {
          push({
            id: id('ev'), sessioneId: sess.id, targetId: targetId, metodoId: null, tipo: 'conseguenza', t: Math.round(istante),
            valore: { contingenzaId: c.id, procedura: c.procedura, azione: azione }, operatoreId: sess.operatoreId, sincronizzato: true
          });
        }
        if (c.schema && c.schema.tipo === 'CRF' && !c.schema.segnalato && /^(rinforzo_positivo|fct|dra|dri)$/.test(c.procedura)) {
          var bersaglio = c.procedura === 'rinforzo_positivo' ? c.targetId : p.alternativoId;
          validi.forEach(function (e) {
            var risposta = e.tipo === 'occorrenza' || e.tipo === 'risposta' || (e.tipo === 'prova' && e.valore.esito !== 'errore');
            if (e.targetId === bersaglio && risposta && rndC() < 0.92) segna(bersaglio, e.t + 2000, 'data');
          });
        }
        if (c.procedura === 'estinzione') {
          validi.forEach(function (e) {
            if (e.targetId === c.targetId && e.tipo === 'occorrenza' && rndC() < 0.1) segna(c.targetId, e.t + 3000, 'errore');
          });
        }
      });
    }

    function evento(t, sess, tipo, istante, valore) {
      return {
        id: id('ev'), sessioneId: sess.id, targetId: t.id, metodoId: t.metodo.id,
        tipo: tipo, t: Math.round(istante), valore: valore, operatoreId: sess.operatoreId,
        sincronizzato: true
      };
    }

    function generaEventi(t, v, sess, S, durMin, push) {
      var p = t.metodo.parametri;
      var D = durMin * 60000;
      switch (t.metodo.tipo) {
        case 'frequenza': {
          var n = Math.max(0, Math.round(limita(v, 0, 5) * durMin));
          var tempi = [];
          for (var i = 0; i < n; i++) tempi.push(S + rnd() * D);
          tempi.sort(function (a, b) { return a - b; });
          tempi.forEach(function (x) { push(evento(t, sess, 'occorrenza', x)); });
          // Ogni tanto un tocco sbagliato corretto con il meno.
          if (rnd() < 0.3) {
            var x = S + rnd() * D;
            var sbagliato = evento(t, sess, 'occorrenza', x);
            push(sbagliato);
            var ann = evento(t, sess, 'annulla', x + 2000);
            ann.rif = sbagliato.id;
            push(ann);
          }
          break;
        }
        case 'durata': {
          var tot = limita(v, 0, durMin * 0.6);
          if (tot < 0.05) break;
          var k = Math.max(1, Math.round(tot / 1.5));
          var slot = D / k;
          var pesi = [];
          for (var j = 0; j < k; j++) pesi.push(0.5 + rnd());
          var somma = pesi.reduce(function (a, b) { return a + b; }, 0);
          pesi.forEach(function (w, j) {
            var len = Math.min((w / somma) * tot * 60000, slot * 0.9);
            var a = S + j * slot + rnd() * (slot - len);
            push(evento(t, sess, 'inizio', a));
            push(evento(t, sess, 'fine', a + len));
          });
          break;
        }
        case 'latenza': {
          for (var q = 0; q < 8; q++) {
            var ist = S + (q + 0.5) * (D / 8);
            var lat = limita(v, 0.5, 20) * (0.75 + rnd() * 0.5);
            push(evento(t, sess, 'istruzione', ist));
            push(evento(t, sess, 'risposta', ist + lat * 1000));
          }
          break;
        }
        case 'intervallo_parziale':
        case 'intervallo_totale':
        case 'momentaneo': {
          var N = Math.round((p.osservazioneMin * 60) / p.intervalloSec);
          var si = Math.round((N * limita(v, 0, 100)) / 100);
          var ordine = [];
          for (var r = 0; r < N; r++) ordine.push({ i: r, k: rnd() });
          ordine.sort(function (a, b) { return a.k - b.k; });
          var presenti = {};
          ordine.slice(0, si).forEach(function (o) { presenti[o.i] = true; });
          var avvio = S + 60000;
          for (var ii = 0; ii < N; ii++) {
            push(evento(t, sess, 'intervallo', avvio + (ii + 1) * p.intervalloSec * 1000,
              { indice: ii, presente: !!presenti[ii] }));
          }
          break;
        }
        case 'dtt': {
          var prove = p.prove || 10;
          var indip = Math.round((prove * limita(v, 0, 100)) / 100);
          var esiti = [];
          for (var a1 = 0; a1 < prove; a1++) {
            if (a1 < indip) esiti.push({ esito: 'corretta', prompt: 'I' });
            else {
              var x2 = rnd();
              if (x2 < 0.3) esiti.push({ esito: 'errore', prompt: null });
              else esiti.push({ esito: 'corretta', prompt: ['V', 'G', 'M', 'FP', 'FT'][Math.floor(rnd() * 5)] });
            }
          }
          esiti.sort(function () { return rnd() - 0.5; });
          esiti.forEach(function (e, n2) { push(evento(t, sess, 'prova', S + 120000 + n2 * 45000, e)); });
          break;
        }
        case 'task_analysis': {
          var passi = p.passi.length;
          var ind = Math.round((passi * limita(v, 0, 100)) / 100);
          // I passi imparati per primi sono quelli finali (concatenamento all'indietro).
          for (var ps = 0; ps < passi; ps++) {
            var indipendente = ps >= passi - ind;
            push(evento(t, sess, 'passo', S + 600000 + ps * 15000, {
              indice: ps,
              prompt: indipendente ? 'I' : ['V', 'G', 'M', 'FP'][Math.floor(rnd() * 4)]
            }));
          }
          break;
        }
        case 'abc': {
          var ep = Math.max(0, Math.round(v));
          for (var e3 = 0; e3 < ep; e3++) {
            push(evento(t, sess, 'abc', S + rnd() * D, {
              a: p.antecedenti[Math.floor(rnd() * p.antecedenti.length)],
              b: p.comportamenti[Math.floor(rnd() * p.comportamenti.length)],
              c: p.conseguenze[Math.floor(rnd() * p.conseguenze.length)],
              nota: ''
            }));
          }
          break;
        }
      }
    }

    // Elenco di tact con obiettivo numerico (tipo VB-MAPP) per PZ-014, con
    // richieste facili alternate alle prove di training. Si aggiunge in fondo,
    // con un generatore a parte, così gli altri dati finti non cambiano.
    (function () {
      var rndT = mulberry32(7102026);
      var sog = soggetti[0];
      var sue = sessioni.filter(function (x) { return x.soggettoId === sog.id; });
      var giornoDi = function (k) { return dataISO(new Date(sue[k].inizio)); };
      sog.repertorio = [
        ['animali', 'cane'], ['animali', 'gatto'], ['cibi', 'acqua'], ['cibi', 'pane'], ['cibi', 'biscotto'],
        ['persone', 'mamma'], ['persone', 'papà'], ['giochi', 'palla'], ['giochi', 'macchina']
      ].map(function (x) { return { id: id('rp'), testo: x[1], operante: 'tact', categoria: x[0], data: giorniPrima(70), nota: 'Valutazione iniziale' }; });
      var voce = function (categoria, testo) { return { id: id('el'), testo: testo, categoria: categoria, stato: 'coda', inizio: null, acquisito: null }; };
      var voci = [
        voce('animali', 'mucca'), voce('cibi', 'mela'), voce('vestiti', 'scarpa'),
        voce('animali', 'cavallo'), voce('cibi', 'banana'), voce('vestiti', 'cappello'),
        voce('animali', 'pecora'), voce('oggetti di casa', 'forchetta'), voce('vestiti', 'maglia'),
        voce('animali', 'gallina'), voce('cibi', 'uva'), voce('vestiti', 'pantaloni'),
        voce('oggetti di casa', 'cucchiaio'), voce('oggetti di casa', 'bicchiere'), voce('giochi', 'treno')
      ];
      // Gruppi di tre: insegnati tra le sedute indicate, acquisiti all'ultima.
      var gruppi = [{ da: 3, a: 8, voci: voci.slice(0, 3) }, { da: 9, a: 13, voci: voci.slice(3, 6) }, { da: 14, a: null, voci: voci.slice(6, 9) }];
      gruppi.forEach(function (g) {
        g.voci.forEach(function (v) {
          v.stato = g.a == null ? 'insegnamento' : 'acquisito';
          v.inizio = giornoDi(g.da);
          if (g.a != null) v.acquisito = giornoDi(g.a);
        });
      });
      var tact = target('Tact di oggetti comuni', 'aumentare', 'dtt', { prove: 10 }, crit(90, 'almeno'), {
        include: 'Dice il nome dell’oggetto o dell’immagine entro 5 secondi da “Cos’è?”, senza aiuti, per ciascuna risposta dell’elenco.',
        esclude: 'Risposta dopo un modello vocale o oltre i 5 secondi; parole approssimate non concordate.',
        esempi: '“Mucca” davanti all’immagine della mucca.'
      }, null, {
        obiettivo: { condizione: 'al tavolo, con immagini e oggetti reali, con l’istruzione “Cos’è?”' },
        insegnamento: insegnamento('dtt', '“Cos’è?” mostrando l’oggetto o l’immagine', 'Oggetti reali e immagini', 'ritardo_progressivo', 2, 'modello_ripeti'),
        generalizzazione: generalizzazione(['Giulia R.', 'Andrea', 'Genitori'], ['Studio', 'Casa'], ['Immagini diverse dello stesso oggetto', 'Oggetti reali']),
        elementi: { attivo: true, operante: 'tact', obiettivo: 25, conta: 'repertorio', inContemporanea: 3, alternanza: { attiva: true, ogni: 1 }, voci: voci },
        protocollo: { manuale: 'vbmapp', nomeManuale: 'VB-MAPP', codice: 'Tact 6' }
      });
      var pr = { id: id('pr'), nome: 'Tact', area: 'insegnare', stato: 'attivo', fasi: [], target: [tact] };
      conPiano(pr, 'acquisizione', null, tact);
      pr.fasi = [
        { id: id('fa'), tipo: 'baseline', inizio: giornoDi(0), nota: 'Sondaggio delle prime risposte', pianoId: pr.piano.fasi[0].id },
        { id: id('fa'), tipo: pr.piano.fasi[1].tipo, inizio: giornoDi(3), nota: 'Avvio del training', pianoId: pr.piano.fasi[1].id }
      ];
      sog.programmi.push(pr);
      sog.schedule.voci.push({ targetId: tact.id });

      // Probabilità di risposta indipendente di una voce nella seduta k.
      function probabilita(v, k) {
        var g = gruppi.find(function (x) { return x.voci.indexOf(v) !== -1; });
        if (k < g.da) return 0.15;
        if (v.testo === 'pecora') return 1;
        if (v.testo === 'forchetta') return 0.5 + 0.1 * (k - g.da);
        if (v.testo === 'maglia') return 0.25;
        var fine = g.a, n = Math.max(fine - g.da, 1);
        return Math.min(0.35 + 0.75 * (k - g.da) / n, 1);
      }
      function esito(p) {
        var x = rndT();
        if (x < p) return { esito: 'corretta', prompt: 'I' };
        return rndT() < 0.6 ? { esito: 'corretta', prompt: ['V', 'G', 'M'][Math.floor(rndT() * 3)] } : { esito: 'errore', prompt: null };
      }

      sue.forEach(function (sess, k) {
        var inIntervento = k >= 3;
        var voceFase = pr.fasi[inIntervento ? 1 : 0];
        sess.fasi[pr.id] = voceFase.tipo;
        sess.fasiId[pr.id] = voceFase.id;
        sess.versioniMetodi[tact.metodo.id] = 1;
        var gruppo = inIntervento ? gruppi.find(function (g) { return k >= g.da && (g.a == null || k <= g.a); }) : gruppi[0];
        // Risposte già acquisite a questa seduta: richieste facili.
        var facili = sog.repertorio.map(function (r) { return { id: r.id, testo: r.testo }; });
        gruppi.forEach(function (g) { if (g.a != null && k > g.a) g.voci.forEach(function (v) { facili.push({ id: v.id, testo: v.testo }); }); });
        var S = sess.inizio + 12 * 60000;
        var n = 0, da = eventi.length;
        for (var i = 0; i < 10; i++) {
          var v = gruppo.voci[i % 3];
          var e = esito(probabilita(v, k));
          e.elemento = v.id; e.elementoTesto = v.testo;
          eventi.push(evento(tact, sess, 'prova', S + n++ * 30000, e));
          if (!inIntervento) continue;
          var f = facili[(k * 7 + i) % facili.length];
          var em = f.testo === 'gatto' && k >= sue.length - 5 && rndT() < 0.6 ? { esito: 'errore', prompt: null } : { esito: 'corretta', prompt: rndT() < 0.95 ? 'I' : 'V' };
          em.elemento = f.id; em.elementoTesto = f.testo; em.mantenimento = true;
          eventi.push(evento(tact, sess, 'prova', S + n++ * 30000, em));
        }
        if (inIntervento) generaConseguenze(pr.piano.fasi[1], sess, eventi.slice(da), function (x) { eventi.push(x); });
      });
    })();

    // Scaletta della seduta per ogni paziente, proposta da seduta.js. Nelle
    // ultime 6 sedute la scaletta c'era già: i blocchi risultano svolti come
    // previsto, ogni evento porta il blocco in cui cade e le prove DTT si
    // dividono tra probe a freddo (le prime, quante ne prevede il probe) e
    // insegnamento. Si aggiunge in
    // fondo, senza numeri casuali, così gli altri dati finti non cambiano.
    var Sd = root.BR.seduta;
    if (Sd) soggetti.forEach(function (s) {
      var proposta = Sd.proponi(s);
      proposta.blocchi.forEach(function (b) { b.id = id('bl'); });
      s.schedule.blocchi = proposta.blocchi;
      s.schedule.continui = proposta.continui;
      sessioni.filter(function (x) { return x.soggettoId === s.id; }).slice(-6).forEach(function (sess) {
        Sd.preparaSessione(sess, s, sess.inizio);
        var orari = Sd.orari(sess.scaletta);
        sess.blocchiSvolti = sess.scaletta.map(function (b, i) {
          return { bloccoId: b.id, inizio: sess.inizio + orari[i].inizio * 60000, fine: Math.min(sess.fine, sess.inizio + orari[i].fine * 60000) };
        });
        var mie = eventi.filter(function (e) { return e.sessioneId === sess.id; });
        var bloccoAlle = function (t) {
          var x = sess.blocchiSvolti.find(function (b) { return t >= b.inizio && t < b.fine; }) || sess.blocchiSvolti[sess.blocchiSvolti.length - 1];
          return sess.scaletta.find(function (b) { return b.id === x.bloccoId; });
        };
        var segna = function (e, b) {
          e.blocco = b.id;
          e.contesto = e.tipo !== 'conseguenza' && b.targetIds.indexOf(e.targetId) !== -1 ? Sd.TIPI[b.tipo].contesto : 'nessuno';
        };
        var togli = [];
        mie.forEach(function (e) { if (e.tipo !== 'prova') segna(e, bloccoAlle(e.t)); });
        // Prove DTT: le prime nel probe, le altre nel primo blocco di insegnamento del target.
        var perTarget = {};
        mie.forEach(function (e) { if (e.tipo === 'prova') (perTarget[e.targetId] = perTarget[e.targetId] || []).push(e); });
        Object.keys(perTarget).forEach(function (tid) {
          var prove = perTarget[tid].sort(function (a, b) { return a.t - b.t; });
          var probe = sess.scaletta.find(function (b) { return b.tipo === 'probe' && b.targetIds.indexOf(tid) !== -1; });
          var ins = sess.scaletta.find(function (b) { return b.tipo === 'insegnamento' && b.targetIds.indexOf(tid) !== -1; });
          // Gli orari restano quelli generati: le conseguenze segnate dipendono da loro.
          var nProbe = probe ? probe.prove || 1 : 0;
          prove.filter(function (e) { return !e.valore.mantenimento; }).slice(0, nProbe).forEach(function (e) { e._probe = true; });
          prove.forEach(function (e) {
            var inProbe = e._probe;
            delete e._probe;
            if (inProbe) {
              segna(e, probe);
              // Nel probe niente rinforzo: via la conseguenza generata per questa prova.
              mie.forEach(function (c) { if (c.tipo === 'conseguenza' && c.targetId === tid && c.t === e.t + 2000) togli.push(c); });
            } else segna(e, ins || bloccoAlle(e.t));
          });
        });
        togli.forEach(function (c) { eventi.splice(eventi.indexOf(c), 1); });
      });
    });

    // Pulizia dei campi usati solo per generare.
    soggetti.forEach(function (s) {
      s.programmi.forEach(function (pr) {
        delete pr._cambio;
        pr.target.forEach(function (t) { delete t._profili; });
      });
    });

    eventi.sort(function (a, b) { return a.t - b.t; });

    return {
      versione: 3,
      generato: oggi.getTime(),
      contesto: 'clinica',
      operatoreCorrente: 'op_andrea',
      config: { operatori: operatori, soggetti: soggetti },
      sessioni: sessioni,
      eventi: eventi,
      rete: { simulaOffline: false, ultimaSincronizzazione: oggi.getTime() },
      preferenze: { riepilogo: {} }
    };
  }

  var api = { genera: genera, giorniDiSeduta: giorniDiSeduta, dataISO: dataISO };
  root.BR = root.BR || {};
  root.BR.datiFinti = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
