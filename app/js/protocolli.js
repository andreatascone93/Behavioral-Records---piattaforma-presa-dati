/*
 * Libreria di protocolli e manuali di valutazione (VB-MAPP e altri), più i
 * modelli di programma per operante usati per creare un obiettivo.
 *
 * Diritti d'autore: dei manuali si tengono solo la struttura (aree, livelli,
 * codici delle milestone) e descrizioni brevi scritte da noi. Il testo delle
 * milestone e i criteri del manuale si completano dalla propria copia: le
 * modifiche restano in stato.config.protocolli come personalizzazioni.
 *
 * stato.config.protocolli = [
 *   { id, tipo: 'personalizzazione', manuale, codice, descrizione, quantita, operante },
 *   { id, tipo: 'manuale', nome, nota, voci: [{ codice, area, livello, descrizione, quantita, operante }] }
 * ]
 */
(function (root) {
  'use strict';

  var M = root.BR && root.BR.modello ? root.BR.modello : require('./modello.js');

  // VB-MAPP (Sundberg, 2008): 170 milestone in 16 aree su 3 livelli, 5 per
  // area e livello, numerate di seguito nell'area (livello 2 = 6-10). Le
  // descrizioni delle aree sono nostre e generiche.
  var AREE_VBMAPP = [
    { id: 'mand', breve: 'Mand', nome: 'Mand', operante: 'mand', livelli: [1, 2, 3], descrizione: 'Chiedere ciò che si vuole: oggetti, azioni, attenzione, informazioni.' },
    { id: 'tact', breve: 'Tact', nome: 'Tact', operante: 'tact', livelli: [1, 2, 3], descrizione: 'Denominare ciò che si vede o si sente: oggetti, azioni, parti, caratteristiche.' },
    { id: 'ascoltatore', breve: 'Ascoltatore', nome: 'Ascoltatore', operante: 'ascoltatore', livelli: [1, 2, 3], descrizione: 'Rispondere alle parole degli altri: scegliere, toccare, eseguire istruzioni.' },
    { id: 'vpmts', breve: 'VP-MTS', nome: 'Percezione visiva e abbinamento (VP-MTS)', operante: 'abbinamento', livelli: [1, 2, 3], descrizione: 'Abbinare, ordinare e completare compiti visivi.' },
    { id: 'gioco', breve: 'Gioco', nome: 'Gioco indipendente', operante: 'altro', livelli: [1, 2, 3], descrizione: 'Giocare da solo con oggetti e giochi in modo funzionale e vario.' },
    { id: 'sociale', breve: 'Sociale', nome: 'Comportamento sociale e gioco sociale', operante: 'altro', livelli: [1, 2, 3], descrizione: 'Interessarsi ai pari, giocare e comunicare con loro.' },
    { id: 'imitazione', breve: 'Imitazione', nome: 'Imitazione motoria', operante: 'imitazione', livelli: [1, 2], descrizione: 'Riprodurre i movimenti di un modello, con e senza oggetti.' },
    { id: 'ecoico', breve: 'Ecoico', nome: 'Ecoico', operante: 'ecoico', livelli: [1, 2], descrizione: 'Ripetere suoni, parole e frasi dette da un altro.' },
    { id: 'vocale', breve: 'Vocale spontaneo', nome: 'Comportamento vocale spontaneo', operante: 'altro', livelli: [1], descrizione: 'Produrre suoni e vocalizzazioni senza richiesta.' },
    { id: 'lrffc', breve: 'LRFFC', nome: 'LRFFC', operante: 'lrffc', livelli: [2, 3], descrizione: 'Scegliere un oggetto sentendone la funzione, una caratteristica o la classe.' },
    { id: 'intraverbale', breve: 'Intraverbale', nome: 'Intraverbale', operante: 'intraverbale', livelli: [2, 3], descrizione: 'Rispondere a parole con parole: completamenti, domande, conversazione.' },
    { id: 'gruppo', breve: 'Gruppo', nome: 'Routine di classe e abilità di gruppo', operante: 'altro', livelli: [2, 3], descrizione: 'Seguire routine e istruzioni in piccolo gruppo.' },
    { id: 'linguistica', breve: 'Linguistica', nome: 'Struttura linguistica', operante: 'altro', livelli: [2, 3], descrizione: 'Lunghezza degli enunciati, grammatica, prosodia.' },
    { id: 'lettura', breve: 'Lettura', nome: 'Lettura', operante: 'testuale', livelli: [3], descrizione: 'Prime abilità di lettura.' },
    { id: 'scrittura', breve: 'Scrittura', nome: 'Scrittura', operante: 'altro', livelli: [3], descrizione: 'Prime abilità grafiche e di scrittura.' },
    { id: 'matematica', breve: 'Matematica', nome: 'Matematica', operante: 'altro', livelli: [3], descrizione: 'Numeri, quantità e prime abilità matematiche.' }
  ];

  function vociVbmapp() {
    var out = [];
    AREE_VBMAPP.forEach(function (a) {
      a.livelli.forEach(function (l) {
        for (var k = 1; k <= 5; k++) {
          var n = (l - 1) * 5 + k;
          out.push({ codice: a.breve + ' ' + n, area: a.id, livello: l, numero: n, descrizione: '', quantita: null, operante: a.operante });
        }
      });
    });
    return out;
  }

  var MANUALI = [
    {
      id: 'vbmapp', nome: 'VB-MAPP', titolo: 'Verbal Behavior Milestones Assessment and Placement Program', autore: 'Sundberg, 2008',
      nota: 'Solo struttura: aree, livelli e codici delle milestone (numerazione da verificare sulla tua copia). Descrizione e quantità di ogni milestone si completano dal manuale.',
      livelli: [{ id: 1, nome: 'Livello 1', eta: '0-18 mesi' }, { id: 2, nome: 'Livello 2', eta: '18-30 mesi' }, { id: 3, nome: 'Livello 3', eta: '30-48 mesi' }],
      aree: AREE_VBMAPP,
      voci: vociVbmapp()
    }
  ];

  /*
   * Modelli di programma per operante: istruzione, correzione e categorie di
   * partenza, scritti da noi secondo la pratica comune dell'analisi del
   * comportamento verbale. Si usano quando si crea un obiettivo.
   */
  var MODELLI = {
    tact: { nome: 'Tact', istruzione: '“Cos’è?” mostrando l’oggetto o l’immagine', materiali: 'Oggetti reali e immagini', correzione: 'modello_ripeti', categorie: ['Animali', 'Cibi', 'Oggetti di casa', 'Veicoli', 'Vestiti', 'Parti del corpo', 'Azioni'] },
    mand: { nome: 'Mand', istruzione: 'Nessuna istruzione: l’occasione è l’oggetto desiderato visibile ma fuori portata', materiali: 'Rinforzatori dalla valutazione delle preferenze', correzione: 'ripresenta_prompt', categorie: ['Cibi', 'Giochi', 'Azioni', 'Informazioni'] },
    intraverbale: { nome: 'Intraverbale', istruzione: 'Frase da completare o domanda, senza immagini', materiali: 'Elenco delle frasi', correzione: 'modello_ripeti', categorie: ['Completamenti di canzoni', 'Completamenti di frasi', 'Versi degli animali', 'Domande personali'] },
    lrffc: { nome: 'LRFFC', istruzione: '“Dammi quello che…” con 3-6 oggetti sul tavolo', materiali: 'Oggetti o immagini in campo', correzione: 'ripresenta_prompt', categorie: ['Funzione', 'Caratteristica', 'Classe'] },
    ascoltatore: { nome: 'Ascoltatore', istruzione: '“Dammi…” o “Tocca…” con 3 o più stimoli in campo', materiali: 'Oggetti o immagini in campo', correzione: 'ripresenta_prompt', categorie: ['Oggetti', 'Persone', 'Parti del corpo', 'Azioni'] },
    ecoico: { nome: 'Ecoico', istruzione: '“Di’…” seguito dal modello vocale', materiali: 'Nessuno', correzione: 'modello_ripeti', categorie: ['Suoni', 'Sillabe', 'Parole', 'Frasi'] },
    imitazione: { nome: 'Imitazione', istruzione: '“Fai così” più il modello', materiali: 'Oggetti per le azioni con oggetti', correzione: 'ripresenta_prompt', categorie: ['Movimenti grossolani', 'Movimenti fini', 'Azioni con oggetti'] },
    abbinamento: { nome: 'Abbinamento', istruzione: '“Metti con lo stesso” con 3 o più stimoli in campo', materiali: 'Coppie di oggetti e immagini', correzione: 'ripresenta_prompt', categorie: ['Identici', 'Non identici', 'Per categoria'] },
    testuale: { nome: 'Lettura', istruzione: '“Leggi”', materiali: 'Cartellini con lettere o parole', correzione: 'modello_ripeti', categorie: ['Lettere', 'Sillabe', 'Parole'] },
    altro: { nome: 'Abilità', istruzione: '', materiali: '', correzione: 'ripresenta_prompt', categorie: [] }
  };

  function personali(stato) { return (stato.config && stato.config.protocolli) || []; }

  function personalizzazione(stato, manuale, codice) {
    return personali(stato).find(function (x) { return x.tipo === 'personalizzazione' && x.manuale === manuale && x.codice === codice; }) || null;
  }

  // Manuali integrati e manuali aggiunti dall'utente, con le personalizzazioni.
  function manuali(stato) {
    var propri = personali(stato).filter(function (x) { return x.tipo === 'manuale'; }).map(function (m) {
      return { id: m.id, nome: m.nome, titolo: m.titolo || '', autore: m.autore || '', nota: m.nota || '', proprio: true, livelli: livelliDa(m.voci), aree: areeDa(m.voci), voci: m.voci };
    });
    return MANUALI.concat(propri).map(function (m) {
      var voci = m.voci.map(function (v) {
        var p = personalizzazione(stato, m.id, v.codice);
        if (!p) return v;
        var x = JSON.parse(JSON.stringify(v));
        ['descrizione', 'quantita', 'operante'].forEach(function (k) { if (p[k] !== undefined && p[k] !== null && p[k] !== '') x[k] = p[k]; });
        x.personalizzata = true;
        return x;
      });
      return Object.assign({}, m, { voci: voci });
    });
  }

  function livelliDa(voci) {
    var visti = {};
    voci.forEach(function (v) { if (v.livello != null && v.livello !== '') visti[v.livello] = true; });
    return Object.keys(visti).sort().map(function (l) { return { id: isNaN(+l) ? l : +l, nome: 'Livello ' + l, eta: '' }; });
  }

  function areeDa(voci) {
    var out = [];
    voci.forEach(function (v) {
      if (!out.some(function (a) { return a.id === v.area; })) out.push({ id: v.area, nome: v.area, operante: v.operante || 'altro', descrizione: '' });
    });
    return out;
  }

  function manuale(stato, id) { return manuali(stato).find(function (m) { return m.id === id; }) || null; }

  function voce(stato, manualeId, codice) {
    var m = manuale(stato, manualeId);
    return m ? m.voci.find(function (v) { return v.codice === codice; }) || null : null;
  }

  function area(m, id) { return (m.aree || []).find(function (a) { return a.id === id; }) || null; }

  function assicura(stato) {
    stato.config.protocolli = stato.config.protocolli || [];
    return stato.config.protocolli;
  }

  // Salva descrizione, quantità o operante di una milestone.
  function personalizza(stato, manualeId, codice, campi) {
    var lista = assicura(stato);
    var p = personalizzazione(stato, manualeId, codice);
    if (!p) { p = { id: M.nuovoId('pp'), tipo: 'personalizzazione', manuale: manualeId, codice: codice }; lista.push(p); }
    ['descrizione', 'quantita', 'operante'].forEach(function (k) { if (k in campi) p[k] = campi[k]; });
    return p;
  }

  /*
   * Voci di un manuale aggiunto, una per riga:
   * codice; area; livello; descrizione; quantità; operante
   * Servono almeno codice e area.
   */
  function leggiVoci(testo) {
    var out = [];
    var visti = {};
    String(testo || '').split('\n').forEach(function (riga) {
      var c = riga.split(';').map(function (x) { return x.trim(); });
      if (!c[0] || !c[1] || visti[c[0]]) return;
      visti[c[0]] = true;
      var op = c[5] && c[5].toLowerCase();
      out.push({
        codice: c[0], area: c[1], livello: c[2] ? (isNaN(+c[2]) ? c[2] : +c[2]) : '',
        descrizione: c[3] || '', quantita: c[4] && !isNaN(+c[4]) ? +c[4] : null,
        operante: op && MODELLI[op] ? op : 'altro'
      });
    });
    return out;
  }

  function nuovoManuale(stato, nome, voci, nota) {
    var m = { id: M.nuovoId('mn'), tipo: 'manuale', nome: nome, nota: nota || '', voci: voci };
    assicura(stato).push(m);
    return m;
  }

  // Target che si rifanno a una milestone, in un soggetto.
  function targetCollegati(sog, manualeId, codice) {
    var out = [];
    sog.programmi.forEach(function (pr) {
      pr.target.forEach(function (t) {
        if (t.protocollo && t.protocollo.manuale === manualeId && t.protocollo.codice === codice) out.push({ programma: pr, target: t });
      });
    });
    return out;
  }

  var api = {
    MANUALI: MANUALI, MODELLI: MODELLI,
    manuali: manuali, manuale: manuale, voce: voce, area: area,
    personalizza: personalizza, personalizzazione: personalizzazione,
    leggiVoci: leggiVoci, nuovoManuale: nuovoManuale, targetCollegati: targetCollegati
  };
  root.BR = root.BR || {};
  root.BR.protocolli = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
