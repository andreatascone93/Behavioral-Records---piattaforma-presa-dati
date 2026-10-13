/*
 * Dati finti per i prototipi: 3 pazienti clinici con programmi che coprono
 * le misure principali, sessioni passate e i relativi eventi grezzi.
 * Il generatore è deterministico (seme fisso), così i grafici sono sempre
 * gli stessi a parità di data di riferimento.
 * Tutti i nomi e i codici sono inventati.
 */
(function (root) {
  'use strict';

  var M = root.BR && root.BR.modello ? root.BR.modello : require('./modello.js');

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
        esempi: 'Schiaffo, calcio, lancio di una costruzione verso l’operatore.'
      },
      pianto: {
        include: 'Pianto o urla udibili da 3 metri, per almeno 3 secondi. Fine dopo 5 secondi di silenzio.',
        esclude: 'Lamenti brevi sotto i 3 secondi.',
        esempi: 'Pianto dopo la richiesta di riordinare.'
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

    function target(nome, direzione, tipo, parametri, criterio, def, profili) {
      var base = JSON.parse(JSON.stringify(M.TIPI[tipo].parametri));
      Object.keys(parametri || {}).forEach(function (k) { base[k] = parametri[k]; });
      return {
        id: id('tg'),
        nome: nome,
        direzione: direzione,
        definizione: def,
        metodo: { id: id('me'), tipo: tipo, versione: 1, parametri: base, criterio: criterio },
        _profili: profili
      };
    }

    // ---- Pazienti -------------------------------------------------------
    var soggetti = [];
    var piani = []; // { soggetto, sessioni: n, ora, operatori, durataMin }

    // PZ-014
    var p1aggr = {
      id: id('pr'), nome: 'Ridurre l’aggressività', area: 'ridurre', stato: 'attivo',
      fasi: [], target: []
    };
    p1aggr.target.push(target('Colpire gli altri', 'ridurre', 'frequenza', {}, crit(0.1, 'al_massimo'), definizioni.colpire,
      { baseline: andamento(rnd, 0.6, 0.65, 0.12), intervento: andamento(rnd, 0.45, 0.14, 0.06) }));
    p1aggr.target.push(target('Crisi di pianto', 'ridurre', 'durata', {}, crit(1, 'al_massimo'), definizioni.pianto,
      { baseline: andamento(rnd, 6, 6.5, 1.2), intervento: andamento(rnd, 5, 1.4, 0.6) }));
    p1aggr.target.push(target('Episodi aggressivi (ABC)', 'ridurre', 'abc',
      { comportamenti: ['Colpire', 'Lanciare oggetti', 'Spingere'] }, null,
      { include: 'Ogni episodio di aggressività, registrato con antecedente e conseguenza.', esclude: '', esempi: '' },
      { baseline: andamento(rnd, 3, 3, 1), intervento: andamento(rnd, 2.5, 0.8, 0.6) }));
    p1aggr._cambio = 6;

    var p1aiuto = {
      id: id('pr'), nome: 'Chiedere aiuto', area: 'insegnare', stato: 'attivo', fasi: [], target: []
    };
    p1aiuto.target.push(target('Chiede aiuto', 'aumentare', 'dtt', { prove: 10 }, crit(80, 'almeno'), definizioni.aiuto,
      { baseline: andamento(rnd, 10, 15, 6), intervento: andamento(rnd, 30, 92, 5) }));
    p1aiuto._cambio = 5;

    soggetti.push({
      id: id('sg'), codice: 'PZ-014', iniziali: 'L.M.', annoNascita: 2018,
      note: 'Diagnosi ASD livello 2. Sedute in studio, 3 volte a settimana.',
      operatori: ['op_andrea', 'op_giulia'],
      programmi: [p1aggr, p1aiuto]
    });
    piani.push({ sessioni: 18, ora: 9, operatori: ['op_giulia', 'op_giulia', 'op_andrea'], durataMin: 30 });

    // PZ-022
    var p2classe = {
      id: id('pr'), nome: 'Autonomia al banco', area: 'insegnare', stato: 'attivo', fasi: [], target: []
    };
    p2classe.target.push(target('Attenzione al compito', 'aumentare', 'intervallo_totale',
      { intervalloSec: 10, osservazioneMin: 5 }, crit(80, 'almeno'), definizioni.attenzione,
      { baseline: andamento(rnd, 28, 32, 6), intervento: andamento(rnd, 40, 68, 6) }));
    p2classe.target.push(target('Alzarsi dal banco', 'ridurre', 'intervallo_parziale',
      { intervalloSec: 10, osservazioneMin: 5 }, crit(10, 'al_massimo'), definizioni.alzarsi,
      { baseline: andamento(rnd, 48, 52, 7), intervento: andamento(rnd, 40, 18, 5) }));
    p2classe._cambio = 6;

    var p2mani = {
      id: id('pr'), nome: 'Lavarsi le mani', area: 'insegnare', stato: 'attivo', fasi: [], target: []
    };
    p2mani.target.push(target('Routine lavaggio mani', 'aumentare', 'task_analysis',
      { passi: ['Aprire l’acqua', 'Bagnare le mani', 'Prendere il sapone', 'Strofinare 10 secondi', 'Sciacquare', 'Asciugare'] },
      crit(80, 'almeno'), definizioni.mani,
      { baseline: andamento(rnd, 17, 17, 4), intervento: andamento(rnd, 33, 67, 6) }));
    p2mani._cambio = 4;

    soggetti.push({
      id: id('sg'), codice: 'PZ-022', iniziali: 'G.F.', annoNascita: 2016,
      note: 'Sedute a scuola con l’insegnante di sostegno presente.',
      operatori: ['op_andrea', 'op_marco'],
      programmi: [p2classe, p2mani]
    });
    piani.push({ sessioni: 18, ora: 11, operatori: ['op_marco'], durataMin: 30 });

    // PZ-031
    var p3imit = {
      id: id('pr'), nome: 'Imitazione motoria', area: 'insegnare', stato: 'attivo', fasi: [], target: []
    };
    p3imit.target.push(target('Imita azioni con il corpo', 'aumentare', 'dtt', { prove: 10 }, crit(80, 'almeno'), definizioni.imitazione,
      { baseline: andamento(rnd, 20, 20, 8), intervento: andamento(rnd, 30, 62, 7) }));
    p3imit._cambio = 4;

    var p3stereo = {
      id: id('pr'), nome: 'Ridurre le stereotipie vocali', area: 'ridurre', stato: 'attivo', fasi: [], target: []
    };
    p3stereo.target.push(target('Vocalizzazioni ripetitive', 'ridurre', 'momentaneo',
      { intervalloSec: 30, osservazioneMin: 10 }, crit(15, 'al_massimo'), definizioni.stereotipie,
      { baseline: andamento(rnd, 60, 62, 7), intervento: andamento(rnd, 50, 32, 7) }));
    p3stereo._cambio = 4;

    var p3nome = {
      id: id('pr'), nome: 'Risposta al nome', area: 'insegnare', stato: 'attivo', fasi: [], target: []
    };
    p3nome.target.push(target('Si gira quando chiamato', 'ridurre', 'latenza', {}, crit(3, 'al_massimo'), definizioni.nome,
      { baseline: andamento(rnd, 6.5, 6, 1), intervento: andamento(rnd, 5, 2.6, 0.5) }));
    p3nome._cambio = 5;

    soggetti.push({
      id: id('sg'), codice: 'PZ-031', iniziali: 'S.B.', annoNascita: 2019,
      note: 'Presa in carico da settembre. Sedute in studio.',
      operatori: ['op_andrea', 'op_giulia'],
      programmi: [p3imit, p3stereo, p3nome]
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
        pr.fasi = [
          { id: id('fa'), tipo: 'baseline', inizio: dataISO(giorni[0]), nota: 'Osservazione iniziale' },
          { id: id('fa'), tipo: 'intervento', inizio: dataISO(giorni[pr._cambio]), nota: 'Avvio del trattamento' }
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
          setting: s.schedule.setting, fasi: {}, versioniMetodi: {}, nota: ''
        };
        sessioni.push(sess);

        s.programmi.forEach(function (pr) {
          var inIntervento = k >= pr._cambio;
          sess.fasi[pr.id] = inIntervento ? 'intervento' : 'baseline';
          var kFase = inIntervento ? k - pr._cambio : k;
          var nFase = inIntervento ? piano.sessioni - pr._cambio : pr._cambio;
          pr.target.forEach(function (t) {
            sess.versioniMetodi[t.metodo.id] = 1;
            var v = t._profili[inIntervento ? 'intervento' : 'baseline'](kFase, nFase);
            generaEventi(t, v, sess, S, durMin, function (e) { eventi.push(e); });
          });
        });
      });
    });

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

    // Pulizia dei campi usati solo per generare.
    soggetti.forEach(function (s) {
      s.programmi.forEach(function (pr) {
        delete pr._cambio;
        pr.target.forEach(function (t) { delete t._profili; });
      });
    });

    eventi.sort(function (a, b) { return a.t - b.t; });

    return {
      versione: 1,
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
