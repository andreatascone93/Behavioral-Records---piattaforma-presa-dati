/*
 * Prototipo mobile: elenco dei pazienti, seduta con gli strumenti di misura
 * a portata di dito, riepilogo configurabile. Funziona senza rete: ogni tocco
 * è un evento salvato subito sul telefono, inviato quando torna la connessione.
 */
BR.archivio.avvia().then(function (statoIniziale) {
  'use strict';

  var M = BR.modello, P = BR.piano, A = BR.archivio, G = BR.grafico, U = BR.ui;
  var esc = U.esc;

  var stato = statoIniziale;
  var vista = { schermo: 'oggi', soggettoId: null, sessioneId: null, personalizza: false };
  var app = document.getElementById('app');
  var wakeLock = null;

  // Riprende una seduta rimasta aperta (es. pagina ricaricata).
  (function () {
    var aperta = stato.sessioni.find(function (s) { return s.stato === 'aperta' && s.operatoreId === stato.operatoreCorrente; });
    var salvata = U.preferenza('mobile-vista');
    if (aperta) { vista.schermo = 'seduta'; vista.soggettoId = aperta.soggettoId; vista.sessioneId = aperta.id; }
    else if (salvata && salvata.schermo === 'riepilogo' && A.soggetto(stato, salvata.soggettoId)) {
      vista.schermo = 'riepilogo'; vista.soggettoId = salvata.soggettoId;
    }
  })();

  function salva() { A.salva(stato); }
  function sog() { return A.soggetto(stato, vista.soggettoId); }
  function sessione() { return stato.sessioni.find(function (s) { return s.id === vista.sessioneId; }) || null; }
  function vai(schermo, extra) {
    vista.schermo = schermo;
    Object.keys(extra || {}).forEach(function (k) { vista[k] = extra[k]; });
    U.preferenza('mobile-vista', { schermo: schermo, soggettoId: vista.soggettoId });
    disegna();
    window.scrollTo(0, 0);
  }

  function vibra(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* non supportato */ } }

  // ---- Rete --------------------------------------------------------------------

  function testataRete() {
    var on = A.online(stato);
    var attesa = A.inAttesa(stato);
    return '<button type="button" class="rete ' + (on ? 'on' : 'off') + '" data-azione="rete" aria-label="Rete: ' + (on ? 'online' : 'offline') + '. Tocca per simulare il cambio.">' +
      '<span class="rete-punto"></span>' + (on ? 'Online' : 'Offline') +
      (attesa ? '<span class="coda dato">' + attesa + '</span>' : '') + '</button>';
  }

  function provaSincronizzazione(silenziosa) {
    if (A.cloudAttivo()) {
      BR.cloud.sincronizzaOra().then(function (r) {
        if (!silenziosa) U.toast(r ? 'Sincronizzato con il cloud' : (BR.cloud.info().errore || 'Cloud non raggiungibile: i dati restano sul telefono'));
      });
      return 0;
    }
    var n = A.sincronizza(stato);
    salva();
    if (n && !silenziosa) U.toast('Inviati ' + n + (n === 1 ? ' evento' : ' eventi') + ' al desktop');
    return n;
  }

  // ---- Schermo: pazienti di oggi ---------------------------------------------

  function schermoOggi() {
    var op = A.operatore(stato, stato.operatoreCorrente);
    var miei = stato.config.soggetti.filter(function (s) { return s.operatori.indexOf(stato.operatoreCorrente) !== -1; });
    var on = A.online(stato);
    var attesa = A.inAttesa(stato);
    return '<header class="testa">' +
        '<div><span class="etichetta">' + esc(U.data(Date.now(), true)) + '</span><h1>Ciao ' + esc(op ? op.nome : '') + '</h1></div>' +
        testataRete() +
      '</header>' +
      (!on ? '<div class="avviso">Sei offline. Puoi registrare lo stesso: i dati restano sul telefono e partono quando torna la rete.</div>' : '') +
      (attesa ? '<div class="carta coda-carta"><div><strong class="dato">' + attesa + '</strong> ' + (attesa === 1 ? 'evento da inviare' : 'eventi da inviare') +
        '<p class="tenue piccolo">Salvati sul telefono, non ancora sul desktop.</p></div>' +
        '<button class="btn btn-primario" type="button" data-azione="sincronizza"' + (on ? '' : ' disabled') + '>Invia ora</button></div>' : '') +
      '<h2 class="sezione">I tuoi pazienti</h2>' +
      '<div class="pazienti">' + miei.map(function (s) {
        var sess = A.sessioniDi(stato, s.id, { soloChiuse: true });
        var ultima = sess[sess.length - 1];
        var aperta = stato.sessioni.find(function (x) { return x.soggettoId === s.id && x.stato === 'aperta'; });
        return '<article class="carta paziente">' +
          '<div class="paziente-testa"><div><span class="dato codice">' + esc(s.codice) + '</span> <span class="tenue">' + esc(s.iniziali) + ' · ' + U.eta(s.annoNascita) + ' anni</span></div>' +
          (aperta ? '<span class="pillola penna">Seduta aperta</span>' : '') + '</div>' +
          '<p class="tenue piccolo">' + s.schedule.voci.length + ' target · ' + s.schedule.durataMin + ' min · ' + esc(s.schedule.setting) +
          (ultima ? ' · ultima seduta ' + U.giorniFa(ultima.inizio) : '') + '</p>' +
          '<div class="paziente-azioni">' +
            (aperta
              ? '<button class="btn btn-primario grande" type="button" data-azione="riprendi" data-id="' + aperta.id + '">Riprendi seduta</button>'
              : '<button class="btn btn-primario grande" type="button" data-azione="inizia" data-id="' + s.id + '"' + (s.schedule.voci.length ? '' : ' disabled') + '>Inizia seduta</button>') +
            '<button class="btn grande" type="button" data-azione="riepilogo" data-id="' + s.id + '">Riepilogo</button>' +
          '</div></article>';
      }).join('') + '</div>' +
      '<footer class="piede">' +
        '<a href="desktop.html">Apri il desktop</a>' +
        '<button class="btn btn-piatto piccolo" type="button" data-azione="cloud">' + esc(BR.pannelloCloud.etichetta(BR.cloud.info()).testo) + ' · Cloud</button>' +
        (A.cloudAttivo() ? '' : '<button class="btn btn-piatto piccolo" type="button" data-azione="ripristina">Ripristina dati di esempio</button>') +
        '<p class="tenue piccolo">' + (A.cloudAttivo()
          ? 'Le sedute si sincronizzano con il cloud dello studio. Il pulsante Online/Offline in alto mette in pausa l’invio.'
          : 'Dati di esempio, solo su questo telefono. Il pulsante Online/Offline in alto simula la rete.') + '</p>' +
      '</footer>';
  }

  // ---- Schermo: seduta ---------------------------------------------------------

  function voci(s) {
    return s.schedule.voci.map(function (v) { return A.trovaTarget(s, v.targetId); }).filter(Boolean);
  }

  function evValidi(sess, t) { return M.eventiValidi(A.eventiDi(stato, sess.id, t.id)); }

  function schermoSeduta() {
    var s = sog(), sess = sessione();
    if (!s || !sess) { vista.schermo = 'oggi'; return schermoOggi(); }
    return '<header class="testa seduta-testa">' +
        '<button class="btn btn-piatto indietro" type="button" data-azione="oggi" aria-label="Torna ai pazienti, la seduta resta aperta">‹</button>' +
        '<div class="seduta-titolo"><span class="dato codice">' + esc(s.codice) + '</span><span class="dato orologio" data-live="sessione">' + U.mmss(Date.now() - sess.inizio) + '</span></div>' +
        testataRete() +
        '<button class="btn btn-primario" type="button" data-azione="termina">Termina</button>' +
      '</header>' +
      (!A.online(stato) ? '<div class="avviso">Offline: ogni tocco viene salvato sul telefono.</div>' : '') +
      '<div class="strumenti">' + voci(s).map(function (x) { return carta(sess, x.programma, x.target); }).join('') + '</div>';
  }

  function carta(sess, pr, t) {
    var tipo = M.TIPI[t.metodo.tipo];
    var corpo = ({
      contatore: strContatore, cronometro: strCronometro, latenza: strLatenza,
      intervalli: strIntervalli, prove: strProve, passi: strPassi, abc: strABC
    }[tipo.strumento])(sess, t);
    var ev = evValidi(sess, t).filter(function (e) { return e.tipo !== 'conseguenza'; });
    return '<section class="strumento" id="s-' + t.id + '">' +
      '<div class="strumento-testa"><div><h3>' + esc(t.nome) + '</h3><span class="tenue piccolo">' + esc(tipo.nome) + ' · ' + esc(P.nomeFase(pr, A.voceDiSessione(pr, sess))) + '</span></div>' +
      (ev.length ? '<button class="btn btn-piatto piccolo annulla" type="button" data-azione="annulla" data-id="' + t.id + '">Annulla ultimo</button>' : '') + '</div>' +
      promemoria(sess, pr, t) +
      corpo +
      (t.definizione && t.definizione.include ? '<details class="definizione"><summary>Definizione operativa</summary><p>' + esc(t.definizione.include) + '</p>' +
        (t.definizione.esclude ? '<p class="tenue">Non conta: ' + esc(t.definizione.esclude) + '</p>' : '') + '</details>' : '') +
      '</section>';
  }

  // Cosa fare dopo il comportamento, secondo la fase del piano in corso, con i
  // tasti per segnare la conseguenza data e il timer per il DRO.
  function contingenzeDi(sess, pr, t) {
    var voce = A.voceDiSessione(pr, sess);
    var fase = voce && voce.pianoId ? P.fasePianificata(pr, voce.pianoId) : null;
    if (!fase) return [];
    return (fase.contingenze || []).filter(function (c) {
      return c.targetId === t.id || (c.parametri && c.parametri.alternativoId === t.id);
    });
  }

  function promemoria(sess, pr, t) {
    return pianoCrisi(pr, t) + conseguenze(sess, pr, t);
  }

  // Per i comportamenti da ridurre, il piano di crisi a portata di mano.
  function pianoCrisi(pr, t) {
    if (t.ruolo !== 'problema') return '';
    var c = P.sicurezzaDi(pr).crisi;
    if (!c.passi) return '';
    return '<details class="crisi"><summary>Piano di crisi</summary>' +
      (c.segnali ? '<p><strong>Quando:</strong> ' + esc(c.segnali) + '</p>' : '') +
      '<p><strong>Cosa fare:</strong> ' + esc(c.passi) + '</p>' +
      (c.fine ? '<p><strong>È finita quando:</strong> ' + esc(c.fine) + '</p>' : '') +
      (c.contatti ? '<p><strong>Avvisare:</strong> ' + esc(c.contatti) + '</p>' : '') + '</details>';
  }

  function conseguenze(sess, pr, t) {
    var righe = contingenzeDi(sess, pr, t);
    if (!righe.length) return '';
    var tm = {};
    pr.target.forEach(function (x) { tm[x.id] = x; });
    var tutti = M.eventiValidi(A.eventiDi(stato, sess.id));
    var miei = evValidi(sess, t).filter(function (e) { return e.tipo === 'conseguenza'; });
    return '<ul class="promemoria" aria-label="Conseguenze programmate">' + righe.map(function (c) {
      return '<li><div><strong>' + esc(P.siglaContingenza(c)) + '</strong> ' + esc(P.descriviContingenza(c, tm)) + '</div>' +
        azioneConseguenza(sess, t, c, tutti) + '</li>';
    }).join('') +
    (miei.length ? '<li class="promemoria-annulla"><button class="btn btn-piatto piccolo" type="button" data-azione="annulla-conseguenza" data-id="' + t.id + '">Annulla ultima conseguenza</button></li>' : '') +
    '</ul>';
  }

  function azioneConseguenza(sess, t, c, tutti) {
    if (c.procedura === 'estinzione') return '';
    if (c.procedura === 'dro') return c.targetId === t.id ? bloccoDro(sess, t, c) : '';
    var n = P.conteggioConsegne(tutti, c.id);
    return '<div class="consegna"><button class="btn piccolo" type="button" data-azione="conseguenza" data-id="' + t.id + '" data-contingenza="' + c.id + '">Conseguenza data</button>' +
      (n ? '<span class="dato tenue">× ' + n + '</span>' : '') + '</div>';
  }

  function contoAllaRovescia(scadenza) {
    return '<span class="dato dro-tempo" data-live="dro" data-scadenza="' + scadenza + '">' + U.mmss(scadenza - Date.now()) + '</span>';
  }

  function bloccoDro(sess, t, c) {
    var st = P.statoDro(c, evValidi(sess, t), Date.now());
    var rinforzatore = c.rinforzatore && c.rinforzatore.descrizione ? c.rinforzatore.descrizione : 'il rinforzatore';
    var att = ' data-id="' + t.id + '" data-contingenza="' + c.id + '"';
    var conto = st.rinforzi ? '<span class="dato tenue">Rinforzi: ' + st.rinforzi + '</span>' : '';
    if (!st.attivo) {
      return '<div class="dro"><button class="btn piccolo" type="button" data-azione="dro-avvia"' + att + '>Avvia timer DRO (' + Math.round(st.intervalloMs / 1000) + ' s)</button>' + conto + '</div>';
    }
    var html = '<div class="dro attivo' + (st.dovuto || st.domanda != null ? ' chiede' : '') + '">';
    if (st.momentaneo) {
      if (st.domanda != null) {
        html += '<p class="dro-domanda">Controllo ' + (st.domanda + 1) + ': il comportamento è presente adesso?</p>' +
          '<div class="dro-scelte"><button class="btn" type="button" data-azione="dro-momento" data-presente="1" data-indice="' + st.domanda + '"' + att + '>Sì, presente</button>' +
          '<button class="btn btn-primario" type="button" data-azione="dro-momento" data-presente="0" data-indice="' + st.domanda + '"' + att + '>No: ' + esc(rinforzatore) + ' dato</button></div>';
      }
      html += '<p class="dro-riga">Prossimo controllo tra ' + contoAllaRovescia(st.scadenza) + '</p>';
    } else if (st.dovuto) {
      html += '<p class="dro-domanda">Intervallo senza il comportamento: dai ' + esc(rinforzatore) + '.</p>' +
        '<div class="dro-scelte"><button class="btn btn-primario" type="button" data-azione="dro-rinforzo"' + att + '>Rinforzo dato</button></div>';
    } else {
      html += '<p class="dro-riga">' + (st.perso ? 'Intervallo perso: il prossimo parte tra ' : 'Rinforzo se non succede per ') + contoAllaRovescia(st.scadenza) + '</p>';
    }
    return html + '<div class="dro-piede">' + conto +
      '<button class="btn btn-piatto piccolo" type="button" data-azione="dro-ferma"' + att + '>Ferma timer</button></div></div>';
  }

  function valoreOra(sess, t) {
    var fine = sess.stato === 'aperta' ? Date.now() : sess.fine;
    return M.calcola(t.metodo, A.eventiDi(stato, sess.id, t.id), { inizio: sess.inizio, fine: fine });
  }

  // Tasso in seduta: sotto il primo minuto si divide per 1, per non mostrare valori enormi.
  function tassoLive(sess, n) { return n / Math.max((Date.now() - sess.inizio) / 60000, 1); }

  function strContatore(sess, t) {
    var r = valoreOra(sess, t);
    var n = evValidi(sess, t).filter(function (e) { return e.tipo === 'occorrenza'; }).length;
    var sotto = t.metodo.tipo === 'irt'
      ? 'IRT medio ' + M.formatta(r.valore, 'irt') + ' s'
      : '<span data-live="tasso" data-id="' + t.id + '">' + M.formatta(tassoLive(sess, n), 'frequenza') + '</span> risposte/min';
    return '<div class="contatore">' +
      '<div class="conteggio"><span class="dato numero">' + n + '</span><span class="tenue piccolo">' + sotto + '</span></div>' +
      '<button class="btn tasto-grande" type="button" data-azione="occorrenza" data-id="' + t.id + '" aria-label="Aggiungi un’occorrenza di ' + esc(t.nome) + '">+1</button>' +
      '</div>';
  }

  function strCronometro(sess, t) {
    var ev = evValidi(sess, t);
    var ultimo = ev[ev.length - 1];
    var inCorso = ultimo && ultimo.tipo === 'inizio';
    var r = valoreOra(sess, t);
    var episodi = ev.filter(function (e) { return e.tipo === 'inizio'; }).length;
    return '<div class="cronometro">' +
      '<div class="conteggio"><span class="dato numero" data-live="durata" data-id="' + t.id + '">' + U.mmss(r.valore * 60000) + '</span>' +
      '<span class="tenue piccolo">' + episodi + (episodi === 1 ? ' episodio' : ' episodi') + ' · totale</span></div>' +
      '<button class="btn tasto-grande' + (inCorso ? ' in-corso' : '') + '" type="button" data-azione="' + (inCorso ? 'fine' : 'inizio') + '" data-id="' + t.id + '">' +
      (inCorso ? 'Ferma <span class="dato" data-live="episodio" data-id="' + t.id + '" data-da="' + ultimo.t + '">' + U.mmss(Date.now() - ultimo.t) + '</span>' : 'Avvia episodio') + '</button>' +
      '</div>';
  }

  function strLatenza(sess, t) {
    var ev = evValidi(sess, t);
    var ultimo = ev[ev.length - 1];
    var attesa = ultimo && ultimo.tipo === 'istruzione';
    var r = valoreOra(sess, t);
    return '<div class="cronometro">' +
      '<div class="conteggio"><span class="dato numero">' + (r.dettagli.prove ? M.formatta(r.valore, 'latenza') + ' s' : '–') + '</span>' +
      '<span class="tenue piccolo">latenza media · ' + (r.dettagli.prove || 0) + ' prove</span></div>' +
      (attesa
        ? '<button class="btn tasto-grande in-corso" type="button" data-azione="risposta" data-id="' + t.id + '">Risposta <span class="dato" data-live="episodio" data-id="' + t.id + '" data-da="' + ultimo.t + '">' + U.mmss(Date.now() - ultimo.t) + '</span></button>'
        : '<button class="btn tasto-grande" type="button" data-azione="istruzione" data-id="' + t.id + '">Istruzione data</button>') +
      '</div>';
  }

  // Stato del timer a intervalli calcolato dagli eventi: avvio, intervalli finiti, esiti dati.
  function statoIntervalli(sess, t) {
    var p = t.metodo.parametri;
    var ev = evValidi(sess, t);
    var avvio = ev.find(function (e) { return e.tipo === 'avvio'; });
    var N = Math.round((p.osservazioneMin * 60) / p.intervalloSec);
    var esiti = {};
    ev.forEach(function (e) { if (e.tipo === 'intervallo') esiti[e.valore.indice] = e.valore.presente; });
    if (!avvio) return { avviato: false, N: N, esiti: esiti };
    var passati = Date.now() - avvio.t;
    var finiti = Math.min(N, Math.floor(passati / (p.intervalloSec * 1000)));
    var daSegnare = -1;
    for (var i = 0; i < finiti; i++) { if (!(i in esiti)) { daSegnare = i; break; } }
    var corrente = finiti < N ? finiti : -1;
    return { avviato: true, avvio: avvio.t, N: N, finiti: finiti, esiti: esiti, daSegnare: daSegnare, corrente: corrente, intervalloMs: p.intervalloSec * 1000 };
  }

  function strIntervalli(sess, t) {
    var st = statoIntervalli(sess, t);
    var tipo = t.metodo.tipo;
    var p = t.metodo.parametri;
    if (!st.avviato) {
      return '<div class="intervalli"><p class="tenue">' + st.N + ' intervalli da ' + p.intervalloSec + ' secondi (' + p.osservazioneMin + ' min). ' +
        (tipo === 'momentaneo' ? 'A fine intervallo il telefono vibra: guarda in quel momento.' : 'A fine intervallo segni se il comportamento c’era.') + '</p>' +
        '<button class="btn tasto-grande" type="button" data-azione="avvia-intervalli" data-id="' + t.id + '">Avvia osservazione</button></div>';
    }
    var segnati = Object.keys(st.esiti).length;
    var si = Object.keys(st.esiti).filter(function (k) { return st.esiti[k]; }).length;
    var domanda = tipo === 'momentaneo' ? 'C’è adesso?' : tipo === 'intervallo_totale' ? 'C’è stato per tutto l’intervallo?' : 'C’è stato almeno una volta?';
    var celle = '';
    for (var i = 0; i < st.N; i++) {
      var cl = i in st.esiti ? (st.esiti[i] ? 'si' : 'no') : i === st.daSegnare ? 'chiede' : i === st.corrente ? 'corrente' : '';
      celle += '<span class="cella ' + cl + '" title="Intervallo ' + (i + 1) + '"></span>';
    }
    var fatto = segnati >= st.N;
    return '<div class="intervalli">' +
      '<div class="conteggio"><span class="dato numero">' + (segnati ? Math.round((si / segnati) * 100) + '%' : '–') + '</span>' +
      '<span class="tenue piccolo">' + segnati + ' di ' + st.N + ' intervalli segnati</span></div>' +
      '<div class="celle" aria-hidden="true">' + celle + '</div>' +
      (fatto ? '<p class="fatto">Osservazione completata.</p>'
        : st.daSegnare >= 0
          ? '<div class="domanda"><strong>Intervallo ' + (st.daSegnare + 1) + ': ' + domanda + '</strong>' +
            '<div class="si-no"><button class="btn tasto-medio" type="button" data-azione="esito" data-id="' + t.id + '" data-indice="' + st.daSegnare + '" data-valore="1">Sì</button>' +
            '<button class="btn tasto-medio" type="button" data-azione="esito" data-id="' + t.id + '" data-indice="' + st.daSegnare + '" data-valore="0">No</button></div></div>'
          : '<div class="attesa-intervallo"><span>Intervallo ' + (st.corrente + 1) + ' in corso</span>' +
            '<span class="barra-tempo"><span data-live="intervallo" data-id="' + t.id + '" data-avvio="' + st.avvio + '" data-ms="' + st.intervalloMs + '"></span></span>' +
            (tipo === 'intervallo_parziale' && !(st.corrente in st.esiti)
              ? '<button class="btn tasto-medio" type="button" data-azione="esito" data-id="' + t.id + '" data-indice="' + st.corrente + '" data-valore="1">È successo adesso</button>' : '') +
            '</div>') +
      '</div>';
  }

  function strProve(sess, t) {
    var ev = evValidi(sess, t).filter(function (e) { return e.tipo === 'prova'; });
    var tot = t.metodo.parametri.prove || 10;
    var indip = ev.filter(function (e) { return e.valore.prompt === 'I'; }).length;
    var pallini = '';
    for (var i = 0; i < Math.max(tot, ev.length); i++) {
      var e = ev[i];
      var cl = !e ? '' : e.valore.esito === 'errore' ? 'errore' : e.valore.prompt === 'I' ? 'indip' : 'aiuto';
      pallini += '<span class="pallino ' + cl + '">' + (e ? (e.valore.esito === 'errore' ? '×' : e.valore.prompt) : i + 1) + '</span>';
    }
    var finite = ev.length >= tot;
    return '<div class="prove">' +
      '<div class="conteggio"><span class="dato numero">' + (ev.length ? Math.round((indip / ev.length) * 100) + '%' : '–') + '</span>' +
      '<span class="tenue piccolo">' + (finite ? 'prove completate' : 'prova ' + (ev.length + 1) + ' di ' + tot) + ' · indipendenti</span></div>' +
      '<div class="pallini">' + pallini + '</div>' +
      '<button class="btn tasto-grande" type="button" data-azione="prova" data-id="' + t.id + '" data-prompt="I">Corretta, indipendente</button>' +
      '<div class="livelli">' + M.PROMPT.slice(0, 5).reverse().map(function (l) {
        return '<button class="btn tasto-livello" type="button" data-azione="prova" data-id="' + t.id + '" data-prompt="' + l.id + '"><span class="dato">' + l.id + '</span><span class="piccolo">' + esc(l.nome) + '</span></button>';
      }).join('') +
      '<button class="btn tasto-livello errore" type="button" data-azione="prova" data-id="' + t.id + '" data-prompt="errore"><span class="dato">×</span><span class="piccolo">Errore</span></button></div>' +
      '</div>';
  }

  function strPassi(sess, t) {
    var perPasso = {};
    evValidi(sess, t).forEach(function (e) { if (e.tipo === 'passo') perPasso[e.valore.indice] = e.valore.prompt; });
    var livelli = M.PROMPT.slice().reverse();
    var r = valoreOra(sess, t);
    return '<div class="passi">' +
      '<div class="conteggio"><span class="dato numero">' + (r.valore == null ? '–' : Math.round(r.valore) + '%') + '</span><span class="tenue piccolo">passi indipendenti</span></div>' +
      '<ol>' + t.metodo.parametri.passi.map(function (nome, i) {
        return '<li><span class="passo-nome">' + esc(nome) + '</span><div class="scelte" role="group" aria-label="Livello di prompt per ' + esc(nome) + '">' +
          livelli.map(function (l) {
            var sel = perPasso[i] === l.id;
            return '<button type="button" class="scelta' + (sel ? ' sel' : '') + (l.id === 'I' ? ' indip' : '') + '" aria-pressed="' + sel + '" title="' + esc(l.nome) + '" data-azione="passo" data-id="' + t.id + '" data-indice="' + i + '" data-prompt="' + l.id + '">' + l.id + '</button>';
          }).join('') + '</div></li>';
      }).join('') + '</ol>' +
      '<p class="tenue piccolo legenda-prompt">I indipendente · V verbale · G gestuale · M modello · FP fisico parziale · FT fisico totale</p></div>';
  }

  var bozzeABC = {};
  function strABC(sess, t) {
    var p = t.metodo.parametri;
    var b = bozzeABC[t.id] || (bozzeABC[t.id] = { a: null, b: null, c: null });
    var n = evValidi(sess, t).filter(function (e) { return e.tipo === 'abc'; }).length;
    function gruppo(chiave, titolo, opzioni) {
      return '<div class="abc-gruppo"><span class="etichetta">' + titolo + '</span><div class="chips">' + opzioni.map(function (o) {
        var sel = b[chiave] === o;
        return '<button type="button" class="chip' + (sel ? ' sel' : '') + '" aria-pressed="' + sel + '" data-azione="abc-scegli" data-id="' + t.id + '" data-chiave="' + chiave + '" data-valore="' + esc(o) + '">' + esc(o) + '</button>';
      }).join('') + '</div></div>';
    }
    var pronto = b.a && b.b && b.c;
    return '<div class="abc">' +
      '<div class="conteggio"><span class="dato numero">' + n + '</span><span class="tenue piccolo">' + (n === 1 ? 'episodio registrato' : 'episodi registrati') + '</span></div>' +
      gruppo('a', 'A · Antecedente', p.antecedenti) +
      gruppo('b', 'B · Comportamento', p.comportamenti) +
      gruppo('c', 'C · Conseguenza', p.conseguenze) +
      '<button class="btn tasto-grande" type="button" data-azione="abc-registra" data-id="' + t.id + '"' + (pronto ? '' : ' disabled') + '>Registra episodio</button></div>';
  }

  // ---- Schermo: fine seduta ----------------------------------------------------

  function schermoFine() {
    var s = sog(), sess = sessione();
    if (!s || !sess) { vista.schermo = 'oggi'; return schermoOggi(); }
    var inviata = sess.sincronizzata;
    return '<header class="testa"><div><span class="etichetta">Seduta terminata · ' + Math.round((sess.fine - sess.inizio) / 60000) + ' min</span><h1>' + esc(s.codice) + '</h1></div>' + testataRete() + '</header>' +
      '<div class="avviso ' + (inviata ? 'ok' : '') + '">' + (inviata
        ? 'Seduta inviata: il desktop la vede già nei grafici.'
        : 'Seduta salvata sul telefono. Partirà da sola quando torni online.') + '</div>' +
      '<h2 class="sezione">Valori di questa seduta</h2>' +
      '<div class="elenco-valori">' + voci(s).map(function (x) {
        var tipo = M.TIPI[x.target.metodo.tipo];
        var punti = A.serie(stato, s, x.programma, x.target, {});
        var questo = punti.find(function (p) { return p.sessione.id === sess.id; });
        var prima = punti.filter(function (p) { return p.sessione.id !== sess.id; }).slice(-5).map(function (p) { return p.valore; }).filter(function (v) { return v != null; });
        var media = M.media(prima);
        return '<div class="riga-valore"><div><strong>' + esc(x.target.nome) + '</strong><span class="tenue piccolo">media delle 5 precedenti: ' + M.formatta(media, x.target.metodo.tipo) + '</span></div>' +
          '<div class="valore-destra"><span class="dato numero-medio">' + (questo ? M.formatta(questo.valore, x.target.metodo.tipo) : '–') + '</span><span class="tenue piccolo">' + esc(tipo.unita) + '</span></div></div>';
      }).join('') + '</div>' +
      '<div class="azioni-fine"><button class="btn btn-primario grande" type="button" data-azione="riepilogo" data-id="' + s.id + '">Vedi il riepilogo</button>' +
      '<button class="btn grande" type="button" data-azione="oggi">Torna ai pazienti</button></div>';
  }

  // ---- Schermo: riepilogo configurabile ----------------------------------------

  function prefRiepilogo(s) {
    var p = stato.preferenze.riepilogo[s.id];
    var tutti = A.targetDi(s).map(function (x) { return x.target.id; });
    if (!p) p = stato.preferenze.riepilogo[s.id] = { ordine: tutti.slice(), nascosti: [], n: 5 };
    // Target nuovi creati dal desktop finiscono in fondo.
    tutti.forEach(function (id) { if (p.ordine.indexOf(id) === -1) p.ordine.push(id); });
    p.ordine = p.ordine.filter(function (id) { return tutti.indexOf(id) !== -1; });
    return p;
  }

  function tendenza(valori, direzione) {
    var v = valori.filter(function (x) { return x != null; });
    if (v.length < 2) return '';
    var meta = Math.floor(v.length / 2);
    var a = M.media(v.slice(0, meta)), b = M.media(v.slice(meta));
    var diff = b - a;
    if (Math.abs(diff) < Math.max(Math.abs(a) * 0.05, 1e-9)) return '<span class="pillola">Stabile</span>';
    var buono = (diff > 0) === (direzione === 'aumentare');
    return '<span class="pillola ' + (buono ? 'bene' : 'attenzione') + '">' + (diff > 0 ? 'In aumento' : 'In calo') + '</span>';
  }

  function schermoRiepilogo() {
    var s = sog();
    if (!s) { vista.schermo = 'oggi'; return schermoOggi(); }
    var pref = prefRiepilogo(s);
    var mappa = {};
    A.targetDi(s).forEach(function (x) { mappa[x.target.id] = x; });
    var testa = '<header class="testa">' +
      '<button class="btn btn-piatto indietro" type="button" data-azione="oggi" aria-label="Torna ai pazienti">‹</button>' +
      '<div class="seduta-titolo"><span class="etichetta">Riepilogo</span><span class="dato codice">' + esc(s.codice) + '</span></div>' +
      testataRete() + '</header>';
    var controlli = '<div class="controlli-riepilogo">' +
      '<div class="segmenti" role="group" aria-label="Sessioni considerate">' + [3, 5, 10].map(function (n) {
        return '<button type="button" class="segmento' + (pref.n === n ? ' sel' : '') + '" aria-pressed="' + (pref.n === n) + '" data-azione="riepilogo-n" data-n="' + n + '">Ultime ' + n + '</button>';
      }).join('') + '</div>' +
      '<button class="btn btn-piatto" type="button" data-azione="personalizza" aria-expanded="' + vista.personalizza + '">' + (vista.personalizza ? 'Fatto' : 'Personalizza') + '</button></div>';

    if (vista.personalizza) {
      return testa + controlli + '<p class="tenue piccolo">Scegli quali target vedere e in che ordine.</p>' +
        '<ol class="personalizza">' + pref.ordine.map(function (id, i) {
          var x = mappa[id];
          var visibile = pref.nascosti.indexOf(id) === -1;
          return '<li><label class="spunta"><input type="checkbox" data-azione="visibile" data-id="' + id + '"' + (visibile ? ' checked' : '') + '> ' + esc(x.target.nome) + '</label>' +
            '<span class="sposta"><button class="btn btn-piatto" type="button" aria-label="Sposta su" data-azione="r-sposta" data-id="' + id + '" data-verso="-1"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
            '<button class="btn btn-piatto" type="button" aria-label="Sposta giù" data-azione="r-sposta" data-id="' + id + '" data-verso="1"' + (i === pref.ordine.length - 1 ? ' disabled' : '') + '>↓</button></span></li>';
        }).join('') + '</ol>';
    }

    var carte = pref.ordine.filter(function (id) { return pref.nascosti.indexOf(id) === -1; }).map(function (id) {
      var x = mappa[id];
      var t = x.target, tipo = M.TIPI[t.metodo.tipo];
      var punti = A.serie(stato, s, x.programma, t, {});
      var ultimi = punti.slice(-pref.n);
      var valori = ultimi.map(function (p) { return p.valore; });
      var ultimo = punti[punti.length - 1];
      var c = A.statoCriterio(x.programma, t, punti);
      var perc = /%/.test(tipo.unita);
      var critHtml = !c ? '' : c.raggiunto ? '<span class="pillola bene">Criterio raggiunto</span>'
        : c.fase === 'baseline' ? '<span class="pillola">Baseline</span>'
        : c.consecutive ? '<span class="pillola attenzione">' + c.consecutive + ' di ' + (c.consecutive + c.mancano) + ' a criterio</span>'
        : '<span class="pillola">Sotto criterio</span>';
      return '<article class="carta riepilogo-carta">' +
        '<div class="rc-testa"><h3>' + esc(t.nome) + '</h3>' + critHtml + '</div>' +
        '<div class="rc-corpo"><div class="rc-valori">' +
          '<div><span class="dato numero-medio">' + (ultimo ? M.formatta(ultimo.valore, t.metodo.tipo) : '–') + '</span><span class="tenue piccolo">' + esc(tipo.unita) + ' · ultima</span></div>' +
          '<div class="tenue piccolo">Media ultime ' + ultimi.length + ': <span class="dato">' + M.formatta(M.media(valori.filter(function (v) { return v != null; })), t.metodo.tipo) + '</span></div>' +
        '</div>' +
        '<div class="rc-mini">' + G.mini(valori, { max: perc ? 100 : null, soglia: t.metodo.criterio ? t.metodo.criterio.soglia : null }) + '</div></div>' +
        '<div class="rc-piede">' + tendenza(valori, t.direzione) + '<span class="tenue piccolo">' + (ultimo ? 'ultima seduta ' + U.giorniFa(ultimo.sessione.inizio) : 'nessuna seduta') + '</span></div>' +
        '</article>';
    }).join('');

    return testa + controlli + (carte || '<p class="tenue">Nessun target visibile. Tocca Personalizza per sceglierli.</p>') +
      '<p class="tenue piccolo nota-locale">Calcolato sul telefono, anche senza rete.</p>';
  }

  // ---- Disegno e aggiornamenti dal vivo ----------------------------------------

  function disegna() {
    var y = window.scrollY;
    var html = ({ oggi: schermoOggi, seduta: schermoSeduta, fine: schermoFine, riepilogo: schermoRiepilogo }[vista.schermo] || schermoOggi)();
    app.innerHTML = html;
    app.setAttribute('data-schermo', vista.schermo);
    window.scrollTo(0, y);
    gestisciWakeLock();
  }

  var firmaIntervalli = '', finitiPrima = 0;
  function tick() {
    if (vista.schermo !== 'seduta') return;
    var sess = sessione();
    if (!sess) return;
    var ora = Date.now();
    var scaduto = false;
    app.querySelectorAll('[data-live]').forEach(function (el) {
      var k = el.getAttribute('data-live');
      if (k === 'sessione') el.textContent = U.mmss(ora - sess.inizio);
      else if (k === 'episodio') el.textContent = U.mmss(ora - +el.getAttribute('data-da'));
      else if (k === 'intervallo') {
        var ms = +el.getAttribute('data-ms');
        var trascorso = (ora - +el.getAttribute('data-avvio')) % ms;
        el.style.width = (trascorso / ms) * 100 + '%';
      } else if (k === 'dro') {
        var resta = +el.getAttribute('data-scadenza') - ora;
        el.textContent = U.mmss(resta);
        if (resta <= 0) scaduto = true;
      } else if (k === 'durata' || k === 'tasso') {
        var x = A.trovaTarget(sog(), el.getAttribute('data-id'));
        if (!x) return;
        var r = valoreOra(sess, x.target);
        el.textContent = k === 'durata' ? U.mmss(r.valore * 60000) : M.formatta(tassoLive(sess, r.dettagli.conteggio), 'frequenza');
      }
    });
    // Un timer DRO è scaduto: rinforzo dovuto o controllo momentaneo.
    if (scaduto && !document.querySelector('.velo')) { vibra([120, 60, 120]); disegna(); return; }
    // Ridisegna quando un intervallo finisce (nuova domanda da fare).
    var finiti = 0;
    var firma = voci(sog()).filter(function (x) { return M.TIPI[x.target.metodo.tipo].strumento === 'intervalli'; })
      .map(function (x) {
        var st = statoIntervalli(sess, x.target);
        finiti += st.finiti || 0;
        return x.target.id + ':' + st.finiti + ':' + st.daSegnare;
      }).join('|');
    if (firma !== firmaIntervalli) {
      if (firmaIntervalli && finiti > finitiPrima) vibra([80, 60, 80]);
      finitiPrima = finiti;
      firmaIntervalli = firma;
      if (!document.querySelector('.velo')) disegna();
    }
  }
  setInterval(tick, 250);

  function gestisciWakeLock() {
    var serve = vista.schermo === 'seduta';
    if (serve && !wakeLock && navigator.wakeLock) {
      navigator.wakeLock.request('screen').then(function (w) { wakeLock = w; w.addEventListener('release', function () { wakeLock = null; }); }).catch(function () { /* non concesso */ });
    } else if (!serve && wakeLock) {
      wakeLock.release().catch(function () {});
      wakeLock = null;
    }
  }

  // ---- Azioni ------------------------------------------------------------------

  function targetDaId(id) { var x = A.trovaTarget(sog(), id); return x ? x.target : null; }

  function procedura(contingenzaId) {
    var trovata = null;
    sog().programmi.forEach(function (pr) {
      ((pr.piano && pr.piano.fasi) || []).forEach(function (f) {
        (f.contingenze || []).forEach(function (c) { if (c.id === contingenzaId) trovata = c.procedura; });
      });
    });
    return trovata;
  }

  function registra(tipo, t, valore) {
    A.registra(stato, sessione(), t, tipo, valore);
    if (A.online(stato)) A.sincronizza(stato);
    salva();
    vibra(15);
    disegna();
  }

  app.addEventListener('click', function (e) {
    var b = e.target.closest('[data-azione]');
    if (!b || b.disabled) return;
    var az = b.getAttribute('data-azione');
    var id = b.getAttribute('data-id');
    var t = vista.schermo === 'seduta' && id ? targetDaId(id) : null;
    switch (az) {
      case 'rete':
        stato.rete.simulaOffline = !stato.rete.simulaOffline;
        if (A.online(stato)) {
          var n = provaSincronizzazione(true);
          U.toast(n ? 'Di nuovo online: inviati ' + n + ' eventi' : 'Di nuovo online');
        } else {
          salva();
          U.toast('Offline simulato: i dati restano sul telefono');
        }
        disegna();
        break;
      case 'sincronizza': provaSincronizzazione(); disegna(); break;
      case 'oggi': vai('oggi'); break;
      case 'cloud': BR.pannelloCloud.apri(); break;
      case 'inizia': {
        vista.soggettoId = id;
        var sess = A.apriSessione(stato, sog());
        salva();
        bozzeABC = {};
        vai('seduta', { sessioneId: sess.id });
        break;
      }
      case 'riprendi': {
        var s2 = stato.sessioni.find(function (x) { return x.id === id; });
        vai('seduta', { sessioneId: s2.id, soggettoId: s2.soggettoId });
        break;
      }
      case 'riepilogo': vai('riepilogo', { soggettoId: id || vista.soggettoId, personalizza: false }); break;
      case 'termina':
        U.conferma('Terminare la seduta?', 'Dopo non potrai più aggiungere dati a questa seduta.', 'Termina seduta').then(function (ok) {
          if (!ok) return;
          var sess = sessione();
          // Chiude gli episodi di durata rimasti aperti.
          voci(sog()).forEach(function (x) {
            var ev = evValidi(sess, x.target);
            var u = ev[ev.length - 1];
            if (x.target.metodo.tipo === 'durata' && u && u.tipo === 'inizio') A.registra(stato, sess, x.target, 'fine');
          });
          A.chiudiSessione(stato, sess);
          if (A.online(stato)) A.sincronizza(stato);
          salva();
          vai('fine');
        });
        break;
      case 'annulla': {
        var tipi = null;
        if (t.metodo.tipo === 'abc') tipi = ['abc'];
        if (/intervallo|momentaneo/.test(t.metodo.tipo)) tipi = ['intervallo', 'avvio'];
        A.annullaUltimo(stato, sessione(), t, tipi);
        if (A.online(stato)) A.sincronizza(stato);
        salva();
        disegna();
        U.toast('Ultimo dato annullato');
        break;
      }
      case 'annulla-conseguenza':
        A.annullaUltimo(stato, sessione(), t, ['conseguenza']);
        if (A.online(stato)) A.sincronizza(stato);
        salva();
        disegna();
        U.toast('Ultima conseguenza annullata');
        break;
      case 'conseguenza': case 'dro-avvia': case 'dro-ferma': case 'dro-rinforzo': case 'dro-momento': {
        var cid = b.getAttribute('data-contingenza');
        var azione = { conseguenza: 'data', 'dro-avvia': 'avvio', 'dro-ferma': 'ferma', 'dro-rinforzo': 'rinforzo', 'dro-momento': 'momento' }[az];
        var valore = { contingenzaId: cid, procedura: az === 'conseguenza' ? procedura(cid) : 'dro', azione: azione };
        if (az === 'dro-momento') { valore.indice = +b.getAttribute('data-indice'); valore.presente = b.getAttribute('data-presente') === '1'; }
        registra('conseguenza', t, valore);
        if (azione === 'data') U.toast('Conseguenza registrata');
        break;
      }
      case 'occorrenza': registra('occorrenza', t); break;
      case 'inizio': registra('inizio', t); break;
      case 'fine': registra('fine', t); break;
      case 'istruzione': registra('istruzione', t); break;
      case 'risposta': registra('risposta', t); break;
      case 'avvia-intervalli': firmaIntervalli = ''; registra('avvio', t); break;
      case 'esito':
        registra('intervallo', t, { indice: +b.getAttribute('data-indice'), presente: b.getAttribute('data-valore') === '1' });
        break;
      case 'prova': {
        var pr = b.getAttribute('data-prompt');
        registra('prova', t, pr === 'errore' ? { esito: 'errore', prompt: null } : { esito: 'corretta', prompt: pr });
        break;
      }
      case 'passo':
        registra('passo', t, { indice: +b.getAttribute('data-indice'), prompt: b.getAttribute('data-prompt') });
        break;
      case 'abc-scegli': {
        var bz = bozzeABC[id];
        var k = b.getAttribute('data-chiave'), v = b.getAttribute('data-valore');
        bz[k] = bz[k] === v ? null : v;
        disegna();
        break;
      }
      case 'abc-registra': {
        var bo = bozzeABC[id];
        registra('abc', t, { a: bo.a, b: bo.b, c: bo.c, nota: '' });
        bozzeABC[id] = { a: null, b: null, c: null };
        disegna();
        break;
      }
      case 'riepilogo-n':
        prefRiepilogo(sog()).n = +b.getAttribute('data-n');
        salva(); disegna();
        break;
      case 'personalizza': vista.personalizza = !vista.personalizza; disegna(); break;
      case 'r-sposta': {
        var p = prefRiepilogo(sog());
        var i = p.ordine.indexOf(id), j = i + +b.getAttribute('data-verso');
        if (j < 0 || j >= p.ordine.length) return;
        p.ordine[i] = p.ordine[j]; p.ordine[j] = id;
        salva(); disegna();
        break;
      }
      case 'ripristina':
        U.conferma('Ripristinare i dati finti?', 'Le sedute registrate e le modifiche fatte in questo browser verranno cancellate.', 'Ripristina').then(function (ok) {
          if (!ok) return;
          stato = A.ripristina();
          vai('oggi');
          U.toast('Dati finti ripristinati');
        });
        break;
    }
  });

  app.addEventListener('change', function (e) {
    var el = e.target;
    if (el.getAttribute('data-azione') !== 'visibile') return;
    var p = prefRiepilogo(sog());
    var id = el.getAttribute('data-id');
    p.nascosti = p.nascosti.filter(function (x) { return x !== id; });
    if (!el.checked) p.nascosti.push(id);
    salva();
  });

  // Rete reale del dispositivo: quando torna, invia la coda.
  window.addEventListener('online', function () {
    var n = provaSincronizzazione(true);
    if (n) U.toast('Di nuovo online: inviati ' + n + ' eventi');
    disegna();
  });
  window.addEventListener('offline', function () { disegna(); });

  // Modifiche fatte dal desktop in un'altra scheda (nuovi target, schedule).
  A.ascolta(function (nuovo) {
    if (!nuovo) return;
    stato = nuovo;
    if (!document.querySelector('.velo')) disegna();
  });

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') { wakeLock = null; gestisciWakeLock(); }
  });

  // Stato del cloud: in seduta si aggiorna solo il pulsante della rete.
  BR.cloud.suCambio(function () {
    if (document.querySelector('.velo')) return;
    if (vista.schermo === 'seduta') {
      var r = app.querySelector('.rete');
      if (r) r.outerHTML = testataRete();
    } else disegna();
  });

  disegna();
  return BR.cloud.avvia();
}).catch(function (e) {
  if (window.console) console.error(e);
  document.body.insertAdjacentHTML('afterbegin', '<p class="avviso" role="alert">L’app non è riuscita a partire: ' + BR.ui.esc(e && e.message || String(e)) + '. Ricarica la pagina.</p>');
});
