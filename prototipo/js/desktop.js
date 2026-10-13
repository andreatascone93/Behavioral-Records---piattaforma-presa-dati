/*
 * Prototipo desktop: configurazione per paziente (programmi, target, metodi
 * di misura, schedule di seduta) e grafici secondo le convenzioni ABA.
 */
(function () {
  'use strict';

  var M = BR.modello, A = BR.archivio, G = BR.grafico, U = BR.ui;
  var esc = U.esc;

  var stato = A.carica();
  var vista = {
    soggettoId: U.preferenza('desktop-paziente'),
    scheda: U.preferenza('desktop-scheda') || 'grafici',
    sessioneAperta: null,
    tabelle: {}
  };
  if (!A.soggetto(stato, vista.soggettoId)) vista.soggettoId = stato.config.soggetti[0].id;

  var SCHEDE = [
    { id: 'grafici', nome: 'Grafici' },
    { id: 'programmi', nome: 'Programmi e target' },
    { id: 'schedule', nome: 'Schedule di seduta' },
    { id: 'sessioni', nome: 'Sessioni' }
  ];

  function salva() { A.salva(stato); disegna(); }
  function corrente() { return A.soggetto(stato, vista.soggettoId); }

  // ---- Barra e elenco pazienti ----------------------------------------------

  function disegnaStatoSync() {
    var el = document.getElementById('stato-sync');
    var attesa = A.inAttesa(stato);
    var aperte = stato.sessioni.filter(function (s) { return s.stato === 'aperta'; }).length;
    if (attesa) {
      el.className = 'pillola attenzione';
      el.textContent = attesa + (attesa === 1 ? ' evento' : ' eventi') + ' ancora sul telefono';
      el.title = 'Arriveranno quando il telefono sincronizza.';
    } else if (aperte) {
      el.className = 'pillola penna';
      el.textContent = 'Seduta in corso sul telefono';
      el.title = '';
    } else {
      el.className = 'pillola bene';
      el.textContent = 'Sincronizzato alle ' + U.ora(stato.rete.ultimaSincronizzazione);
      el.title = '';
    }
  }

  function disegnaElenco() {
    var nav = document.getElementById('elenco-pazienti');
    nav.innerHTML = stato.config.soggetti.map(function (s) {
      var sess = A.sessioniDi(stato, s.id, { soloChiuse: true });
      var ultima = sess[sess.length - 1];
      var raggiunti = 0;
      A.targetDi(s).forEach(function (x) {
        var c = A.statoCriterio(x.programma, x.target, A.serie(stato, s, x.programma, x.target, { soloSincronizzate: true }));
        if (c && c.raggiunto) raggiunti++;
      });
      return '<button type="button" class="paziente' + (s.id === vista.soggettoId ? ' attivo' : '') + '" data-azione="scegli-paziente" data-id="' + s.id + '"' +
        (s.id === vista.soggettoId ? ' aria-current="true"' : '') + '>' +
        '<span class="paziente-codice dato">' + esc(s.codice) + '</span>' +
        '<span class="paziente-nome">' + esc(s.iniziali) + ' · ' + U.eta(s.annoNascita) + ' anni</span>' +
        '<span class="paziente-info tenue">' + s.programmi.length + ' programmi · ' +
        (ultima ? 'ultima seduta ' + U.giorniFa(ultima.inizio) : 'nessuna seduta') + '</span>' +
        (raggiunti ? '<span class="pillola bene">' + raggiunti + ' a criterio</span>' : '') +
        '</button>';
    }).join('');
  }

  // ---- Pagina del paziente ------------------------------------------------

  function disegna() {
    disegnaStatoSync();
    disegnaElenco();
    var s = corrente();
    var main = document.getElementById('principale');
    var operatori = s.operatori.map(function (id) { var o = A.operatore(stato, id); return o ? o.nome : id; }).join(', ');
    var html =
      '<div class="testata">' +
        '<div class="testata-titolo">' +
          '<span class="etichetta">Paziente</span>' +
          '<h1><span class="dato">' + esc(s.codice) + '</span> <span class="tenue">' + esc(s.iniziali) + '</span></h1>' +
          '<p class="tenue">Nato nel ' + s.annoNascita + ' · Operatori: ' + esc(operatori) + '</p>' +
          (s.note ? '<p class="testata-nota">' + esc(s.note) + '</p>' : '') +
        '</div>' +
      '</div>' +
      '<div class="schede" role="tablist">' + SCHEDE.map(function (t) {
        return '<button type="button" role="tab" class="scheda' + (t.id === vista.scheda ? ' attiva' : '') + '" aria-selected="' + (t.id === vista.scheda) + '" data-azione="scheda" data-id="' + t.id + '">' + t.nome + '</button>';
      }).join('') + '</div>' +
      '<div class="contenuto" role="tabpanel">' + ({
        grafici: vistaGrafici, programmi: vistaProgrammi, schedule: vistaSchedule, sessioni: vistaSessioni
      }[vista.scheda])(s) + '</div>';
    main.innerHTML = html;
  }

  function pillolaCriterio(c) {
    if (!c) return '<span class="pillola">Senza criterio</span>';
    if (c.raggiunto) return '<span class="pillola bene">Criterio raggiunto</span>';
    if (c.fase === 'baseline') return '<span class="pillola">In baseline</span>';
    if (c.consecutive > 0) return '<span class="pillola attenzione">' + c.consecutive + ' di ' + (c.consecutive + c.mancano) + ' sessioni a criterio</span>';
    return '<span class="pillola">Sotto criterio</span>';
  }

  // Grafici: un grafico per target, raggruppati per programma.
  function vistaGrafici(s) {
    if (!s.programmi.length) return vuoto('Nessun programma per questo paziente.', 'Crea il primo programma nella scheda Programmi e target.');
    return s.programmi.map(function (pr) {
      var fase = A.faseCorrente(pr);
      var carte = pr.target.map(function (t) {
        var punti = A.serie(stato, s, pr, t, { soloSincronizzate: true });
        var c = A.statoCriterio(pr, t, punti);
        var tipo = M.TIPI[t.metodo.tipo];
        var ultimo = punti.length ? punti[punti.length - 1] : null;
        var chiaveTab = t.id;
        var tabella = vista.tabelle[chiaveTab];
        var extra = '';
        if (t.metodo.tipo === 'dtt' && ultimo) extra = distribuzionePrompt(punti);
        if (t.metodo.tipo === 'abc') extra = combinazioniABC(punti);
        return '<article class="carta-grafico">' +
          '<div class="carta-testa">' +
            '<div><h3>' + esc(t.nome) + '</h3>' +
            '<p class="tenue piccolo">' + esc(tipo.nome) + ' · ' + esc(M.descriviCriterio(t.metodo.criterio, t.metodo.tipo)) + '</p></div>' +
            '<div class="carta-valore"><span class="dato grande">' + (ultimo ? M.formatta(ultimo.valore, t.metodo.tipo) : '–') + '</span>' +
            '<span class="tenue piccolo">' + esc(tipo.unita) + ' · ultima</span></div>' +
          '</div>' +
          '<div class="carta-stato">' + pillolaCriterio(c) +
            (t.direzione === 'ridurre' ? '<span class="pillola senza-punto">Da ridurre</span>' : '<span class="pillola senza-punto">Da aumentare</span>') +
          '</div>' +
          (c && c.raggiunto && fase === 'intervento'
            ? '<div class="proposta"><span>Il criterio è raggiunto. Vuoi passare alla fase di mantenimento?</span>' +
              '<button class="btn btn-primario" type="button" data-azione="cambia-fase" data-programma="' + pr.id + '" data-fase="mantenimento">Passa a mantenimento</button></div>'
            : '') +
          '<div class="grafico-box">' + G.aba({ punti: punti, tipo: t.metodo.tipo, criterio: t.metodo.criterio, titolo: t.nome, larghezza: 600, altezza: 230 }) + '</div>' +
          (punti.escluse ? '<p class="tenue piccolo">' + punti.escluse + (punti.escluse === 1 ? ' sessione registrata' : ' sessioni registrate') + ' con un tipo di misura precedente non ' + (punti.escluse === 1 ? 'è' : 'sono') + ' nel grafico.</p>' : '') +
          extra +
          '<button class="btn btn-piatto piccolo" type="button" data-azione="tabella" data-id="' + chiaveTab + '">' + (tabella ? 'Nascondi i valori' : 'Mostra i valori in tabella') + '</button>' +
          (tabella ? tabellaValori(punti, t) : '') +
        '</article>';
      }).join('');
      return '<section class="gruppo">' +
        '<div class="gruppo-testa"><h2>' + esc(pr.nome) + '</h2>' +
        '<span class="pillola penna">Fase: ' + esc(M.FASI[fase]) + '</span></div>' +
        (carte ? '<div class="griglia-grafici">' + carte + '</div>' : '<p class="tenue">Nessun target in questo programma.</p>') +
      '</section>';
    }).join('');
  }

  function tabellaValori(punti, t) {
    return '<div class="tabella-box"><table class="tabella"><thead><tr><th>Sessione</th><th>Data</th><th>Fase</th><th class="num">' + esc(M.TIPI[t.metodo.tipo].unita) + '</th></tr></thead><tbody>' +
      punti.map(function (p, i) {
        return '<tr><td class="dato">' + (i + 1) + '</td><td>' + U.data(p.sessione.inizio) + '</td><td>' + esc(M.FASI[p.fase]) + '</td><td class="num dato">' + M.formatta(p.valore, t.metodo.tipo) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  // Distribuzione dei livelli di prompt nelle ultime sessioni DTT.
  function distribuzionePrompt(punti) {
    var ultimi = punti.slice(-5);
    var livelli = M.PROMPT.slice().reverse().concat([{ id: 'errore', nome: 'Errore' }]);
    var righe = ultimi.map(function (p) {
      var d = p.dettagli.distribuzione, tot = p.dettagli.prove || 1;
      return '<div class="dist-riga"><span class="dato tenue">S' + (punti.indexOf(p) + 1) + '</span><div class="dist-barra">' +
        livelli.map(function (l) {
          var v = d[l.id] || 0;
          if (!v) return '';
          return '<span class="dist-' + l.id + '" style="width:' + (v / tot) * 100 + '%" title="' + esc(l.nome) + ': ' + v + '"></span>';
        }).join('') + '</div></div>';
    }).join('');
    return '<details class="dettagli"><summary>Livelli di prompt nelle ultime ' + ultimi.length + ' sessioni</summary>' +
      '<div class="dist">' + righe + '</div>' +
      '<div class="legenda">' + livelli.map(function (l) {
        return '<span><i class="dist-' + l.id + '"></i>' + esc(l.nome) + '</span>';
      }).join('') + '</div></details>';
  }

  function combinazioniABC(punti) {
    var tot = {};
    punti.forEach(function (p) {
      Object.keys(p.dettagli.combinazioni || {}).forEach(function (k) { tot[k] = (tot[k] || 0) + p.dettagli.combinazioni[k]; });
    });
    var righe = Object.keys(tot).sort(function (a, b) { return tot[b] - tot[a]; }).slice(0, 6);
    if (!righe.length) return '';
    return '<details class="dettagli"><summary>Combinazioni A-B-C più frequenti</summary><table class="tabella"><thead><tr><th>Antecedente → comportamento → conseguenza</th><th class="num">Episodi</th></tr></thead><tbody>' +
      righe.map(function (k) { return '<tr><td>' + esc(k) + '</td><td class="num dato">' + tot[k] + '</td></tr>'; }).join('') +
      '</tbody></table></details>';
  }

  // Programmi e target
  function vistaProgrammi(s) {
    var out = '<div class="azioni-vista"><button class="btn btn-primario" type="button" data-azione="nuovo-programma">+ Nuovo programma</button></div>';
    if (!s.programmi.length) return out + vuoto('Ancora nessun programma.', 'Un programma raccoglie i target su cui lavori per un obiettivo.');
    return out + s.programmi.map(function (pr) {
      return '<section class="carta programma">' +
        '<div class="programma-testa">' +
          '<div><span class="etichetta">' + (pr.area === 'ridurre' ? 'Comportamento da ridurre' : 'Abilità da insegnare') + '</span>' +
          '<h2>' + esc(pr.nome) + '</h2></div>' +
          '<div class="programma-azioni">' +
            '<button class="btn" type="button" data-azione="cambia-fase" data-programma="' + pr.id + '">Cambia fase</button>' +
            '<button class="btn" type="button" data-azione="modifica-programma" data-programma="' + pr.id + '">Rinomina</button>' +
          '</div>' +
        '</div>' +
        '<ol class="fasi">' + pr.fasi.map(function (f, i) {
          var ultima = i === pr.fasi.length - 1;
          return '<li class="' + (ultima ? 'corrente' : '') + '"><span class="fase-nome">' + esc(M.FASI[f.tipo]) + '</span>' +
            '<span class="tenue piccolo">dal ' + U.data(new Date(f.inizio + 'T12:00:00').getTime()) + (ultima ? ' · in corso' : '') + '</span></li>';
        }).join('') + '</ol>' +
        '<div class="tabella-box"><table class="tabella target"><thead><tr><th>Target</th><th>Misura</th><th>Sul telefono</th><th>Criterio</th><th></th></tr></thead><tbody>' +
        pr.target.map(function (t) {
          var tipo = M.TIPI[t.metodo.tipo];
          return '<tr><td><strong>' + esc(t.nome) + '</strong><div class="tenue piccolo definizione">' + esc(t.definizione.include || '') + '</div></td>' +
            '<td>' + esc(tipo.nome) + parametriBrevi(t.metodo) + '<div class="tenue piccolo">versione ' + t.metodo.versione + '</div></td>' +
            '<td>' + esc(tipo.strumentoNome) + '</td>' +
            '<td class="piccolo">' + esc(M.descriviCriterio(t.metodo.criterio, t.metodo.tipo)) + '</td>' +
            '<td class="num"><button class="btn btn-piatto" type="button" data-azione="modifica-target" data-programma="' + pr.id + '" data-id="' + t.id + '">Modifica</button></td></tr>';
        }).join('') +
        '</tbody></table></div>' +
        '<button class="btn btn-piatto" type="button" data-azione="nuovo-target" data-programma="' + pr.id + '">+ Aggiungi target</button>' +
      '</section>';
    }).join('');
  }

  function parametriBrevi(metodo) {
    var p = metodo.parametri;
    switch (metodo.tipo) {
      case 'intervallo_parziale': case 'intervallo_totale': case 'momentaneo':
        return '<div class="tenue piccolo">intervalli di ' + p.intervalloSec + ' s per ' + p.osservazioneMin + ' min</div>';
      case 'dtt': return '<div class="tenue piccolo">' + p.prove + ' prove</div>';
      case 'task_analysis': return '<div class="tenue piccolo">' + p.passi.length + ' passi</div>';
      default: return '';
    }
  }

  // Schedule di seduta
  function vistaSchedule(s) {
    var sc = s.schedule;
    var tutti = A.targetDi(s);
    var dentro = sc.voci.map(function (v) { return A.trovaTarget(s, v.targetId); }).filter(Boolean);
    var fuori = tutti.filter(function (x) { return !sc.voci.some(function (v) { return v.targetId === x.target.id; }); });
    return '<div class="schedule">' +
      '<section class="carta">' +
        '<h2>Impostazioni della seduta</h2>' +
        '<div class="campi-riga">' +
          '<div class="campo"><label for="sc-nome">Nome</label><input id="sc-nome" type="text" value="' + esc(sc.nome) + '" data-campo-schedule="nome"></div>' +
          '<div class="campo"><label for="sc-durata">Durata prevista (min)</label><input id="sc-durata" type="number" min="5" max="240" value="' + sc.durataMin + '" data-campo-schedule="durataMin"></div>' +
          '<div class="campo"><label for="sc-setting">Setting</label><input id="sc-setting" type="text" value="' + esc(sc.setting) + '" data-campo-schedule="setting"></div>' +
        '</div>' +
        '<h3 class="sotto">Ordine dei target in seduta</h3>' +
        (dentro.length ? '<ol class="voci">' + dentro.map(function (x, i) {
          var tipo = M.TIPI[x.target.metodo.tipo];
          return '<li class="voce"><span class="voce-n dato">' + (i + 1) + '</span>' +
            '<div class="voce-testo"><strong>' + esc(x.target.nome) + '</strong><span class="tenue piccolo">' + esc(x.programma.nome) + ' · ' + esc(tipo.strumentoNome) + '</span></div>' +
            '<div class="voce-azioni">' +
              '<button class="btn btn-piatto" type="button" aria-label="Sposta su" data-azione="sposta" data-id="' + x.target.id + '" data-verso="-1"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
              '<button class="btn btn-piatto" type="button" aria-label="Sposta giù" data-azione="sposta" data-id="' + x.target.id + '" data-verso="1"' + (i === dentro.length - 1 ? ' disabled' : '') + '>↓</button>' +
              '<button class="btn btn-piatto btn-pericolo" type="button" data-azione="togli-voce" data-id="' + x.target.id + '">Togli</button>' +
            '</div></li>';
        }).join('') + '</ol>' : '<p class="tenue">Nessun target nella seduta.</p>') +
        (fuori.length ? '<div class="aggiungi-voce"><select id="sc-aggiungi" aria-label="Target da aggiungere">' + fuori.map(function (x) {
          return '<option value="' + x.target.id + '">' + esc(x.target.nome) + ' (' + esc(x.programma.nome) + ')</option>';
        }).join('') + '</select><button class="btn" type="button" data-azione="aggiungi-voce">Aggiungi alla seduta</button></div>' : '') +
      '</section>' +
      '<aside class="anteprima" aria-label="Anteprima sul telefono">' +
        '<span class="etichetta">Così la vede il telefono</span>' +
        '<div class="telefono-mini">' +
          '<div class="tm-testa"><span class="dato">' + esc(s.codice) + '</span><span class="dato">00:00</span></div>' +
          dentro.map(function (x) {
            return '<div class="tm-voce"><span>' + esc(x.target.nome) + '</span><span class="tm-strumento">' + esc(M.TIPI[x.target.metodo.tipo].strumentoNome) + '</span></div>';
          }).join('') +
        '</div>' +
        '<a class="btn" href="mobile.html">Provala sul telefono</a>' +
      '</aside>' +
    '</div>';
  }

  // Sessioni con gli eventi grezzi
  function vistaSessioni(s) {
    var sess = A.sessioniDi(stato, s.id, {}).slice().reverse();
    if (!sess.length) return vuoto('Nessuna sessione registrata.', 'Le sedute registrate dal telefono compaiono qui dopo la sincronizzazione.');
    return '<p class="tenue intro">Ogni sessione conserva gli eventi grezzi registrati sul telefono; i valori dei grafici si calcolano da questi.</p>' +
      '<div class="tabella-box"><table class="tabella sessioni"><thead><tr><th>Data</th><th>Ora</th><th>Operatore</th><th class="num">Durata</th><th class="num">Eventi</th><th>Stato</th><th></th></tr></thead><tbody>' +
      sess.map(function (x) {
        var ev = A.eventiDi(stato, x.id);
        var op = A.operatore(stato, x.operatoreId);
        var statoHtml = x.stato === 'aperta' ? '<span class="pillola penna">In corso</span>'
          : x.sincronizzata ? '<span class="pillola bene">Sincronizzata</span>'
          : '<span class="pillola attenzione">Solo sul telefono</span>';
        var aperta = vista.sessioneAperta === x.id;
        var riga = '<tr class="' + (x.sincronizzata ? '' : 'non-sinc') + '"><td>' + U.data(x.inizio) + '</td><td class="dato">' + U.ora(x.inizio) + '</td><td>' + esc(op ? op.nome : '') + '</td>' +
          '<td class="num dato">' + (x.fine ? Math.round((x.fine - x.inizio) / 60000) + ' min' : '–') + '</td><td class="num dato">' + ev.length + '</td><td>' + statoHtml + '</td>' +
          '<td class="num"><button class="btn btn-piatto" type="button" data-azione="apri-sessione" data-id="' + x.id + '" aria-expanded="' + aperta + '">' + (aperta ? 'Chiudi' : 'Eventi') + '</button></td></tr>';
        if (aperta) riga += '<tr class="riga-eventi"><td colspan="7">' + registroEventi(s, x, ev) + '</td></tr>';
        return riga;
      }).join('') + '</tbody></table></div>';
  }

  function registroEventi(s, sess, ev) {
    var annullati = {};
    ev.forEach(function (e) { if (e.tipo === 'annulla') annullati[e.rif] = true; });
    var ord = ev.slice().sort(function (a, b) { return a.t - b.t; });
    return '<div class="registro">' + ord.map(function (e) {
      var x = A.trovaTarget(s, e.targetId);
      return '<div class="ev' + (annullati[e.id] ? ' annullato' : '') + (e.tipo === 'annulla' ? ' correzione' : '') + '">' +
        '<span class="dato tenue">' + U.mmss(e.t - sess.inizio) + '</span>' +
        '<span>' + esc(x ? x.target.nome : '?') + '</span>' +
        '<span class="dato">' + esc(descriviEvento(e)) + '</span>' +
        (e.sincronizzato ? '' : '<span class="pillola attenzione">da inviare</span>') + '</div>';
    }).join('') + '</div>';
  }

  function descriviEvento(e) {
    var v = e.valore;
    switch (e.tipo) {
      case 'intervallo': return 'intervallo ' + (v.indice + 1) + ': ' + (v.presente ? 'sì' : 'no');
      case 'prova': return 'prova: ' + (v.esito === 'errore' ? 'errore' : 'corretta, ' + v.prompt);
      case 'passo': return 'passo ' + (v.indice + 1) + ': ' + v.prompt;
      case 'abc': return v.a + ' → ' + v.b + ' → ' + v.c;
      case 'annulla': return 'annulla l’evento precedente';
      case 'inizio': return 'inizio episodio';
      case 'fine': return 'fine episodio';
      case 'avvio': return 'avvio osservazione';
      case 'istruzione': return 'istruzione data';
      default: return e.tipo;
    }
  }

  function vuoto(titolo, testo) {
    return '<div class="vuoto"><h3>' + esc(titolo) + '</h3><p class="tenue">' + esc(testo) + '</p></div>';
  }

  // ---- Modifiche --------------------------------------------------------------

  function modificaTarget(pr, t) {
    var nuovo = !t;
    var bozza = t ? JSON.parse(JSON.stringify(t)) : {
      id: M.nuovoId('tg'), nome: '', direzione: pr.area === 'ridurre' ? 'ridurre' : 'aumentare',
      definizione: { include: '', esclude: '', esempi: '' },
      metodo: { id: M.nuovoId('me'), tipo: pr.area === 'ridurre' ? 'frequenza' : 'dtt', versione: 1, parametri: JSON.parse(JSON.stringify(M.TIPI[pr.area === 'ridurre' ? 'frequenza' : 'dtt'].parametri)), criterio: null }
    };
    var c = bozza.metodo.criterio;
    var html =
      '<div class="modulo">' +
        '<div class="campi-riga">' +
          '<div class="campo largo"><label for="t-nome">Nome del target</label><input id="t-nome" type="text" required value="' + esc(bozza.nome) + '" placeholder="Es. Chiede una pausa"></div>' +
          '<div class="campo"><label for="t-direzione">Obiettivo</label><select id="t-direzione">' +
            '<option value="aumentare"' + (bozza.direzione === 'aumentare' ? ' selected' : '') + '>Da aumentare</option>' +
            '<option value="ridurre"' + (bozza.direzione === 'ridurre' ? ' selected' : '') + '>Da ridurre</option></select></div>' +
        '</div>' +
        '<fieldset><legend>Definizione operativa</legend>' +
          '<div class="campo"><label for="t-include">Cosa conta</label><textarea id="t-include">' + esc(bozza.definizione.include) + '</textarea></div>' +
          '<div class="campo"><label for="t-esclude">Cosa non conta</label><textarea id="t-esclude">' + esc(bozza.definizione.esclude) + '</textarea></div>' +
          '<div class="campo"><label for="t-esempi">Esempi</label><input id="t-esempi" type="text" value="' + esc(bozza.definizione.esempi) + '"></div>' +
        '</fieldset>' +
        '<fieldset><legend>Metodo di misura</legend>' +
          '<div class="campo"><label for="t-tipo">Tipo di misura</label><select id="t-tipo">' +
            Object.keys(M.TIPI).map(function (k) {
              return '<option value="' + k + '"' + (k === bozza.metodo.tipo ? ' selected' : '') + '>' + esc(M.TIPI[k].nome) + '</option>';
            }).join('') + '</select><span class="aiuto" id="t-tipo-aiuto"></span></div>' +
          '<div id="t-parametri"></div>' +
        '</fieldset>' +
        '<fieldset><legend>Criterio di padronanza</legend>' +
          '<label class="spunta"><input id="t-usa-criterio" type="checkbox"' + (c ? ' checked' : '') + '> Usa un criterio</label>' +
          '<div class="campi-riga" id="t-criterio">' +
            '<div class="campo"><label for="t-verso">Valore</label><select id="t-verso"><option value="almeno"' + (c && c.verso === 'almeno' ? ' selected' : '') + '>almeno</option><option value="al_massimo"' + (c && c.verso === 'al_massimo' ? ' selected' : '') + '>al massimo</option></select></div>' +
            '<div class="campo"><label for="t-soglia">Soglia <span class="tenue" id="t-unita"></span></label><input id="t-soglia" type="number" step="any" min="0" value="' + (c ? c.soglia : 80) + '"></div>' +
            '<div class="campo"><label for="t-sessioni">Sessioni consecutive</label><input id="t-sessioni" type="number" min="1" max="10" value="' + (c ? c.sessioni : 3) + '"></div>' +
          '</div>' +
        '</fieldset>' +
        (nuovo ? '' : '<p class="tenue piccolo">Se cambi il tipo o i parametri della misura, il metodo passa alla versione ' + (bozza.metodo.versione + 1) + '. Le sessioni già registrate restano legate alla versione con cui sono state raccolte.</p>') +
      '</div>';

    function parametriHtml(tipo, p) {
      switch (tipo) {
        case 'intervallo_parziale': case 'intervallo_totale': case 'momentaneo':
          return '<div class="campi-riga"><div class="campo"><label for="p-int">Lunghezza intervallo (s)</label><input id="p-int" type="number" min="1" value="' + (p.intervalloSec || 10) + '"></div>' +
            '<div class="campo"><label for="p-oss">Osservazione (min)</label><input id="p-oss" type="number" min="1" value="' + (p.osservazioneMin || 5) + '"></div></div>';
        case 'dtt':
          return '<div class="campo"><label for="p-prove">Prove per sessione</label><input id="p-prove" type="number" min="1" max="50" value="' + (p.prove || 10) + '"></div>';
        case 'task_analysis':
          return '<div class="campo"><label for="p-passi">Passi, uno per riga</label><textarea id="p-passi" rows="6">' + esc((p.passi || []).join('\n')) + '</textarea></div>';
        case 'abc':
          return '<div class="campo"><label for="p-a">Antecedenti, uno per riga</label><textarea id="p-a">' + esc((p.antecedenti || []).join('\n')) + '</textarea></div>' +
            '<div class="campo"><label for="p-b">Comportamenti, uno per riga</label><textarea id="p-b">' + esc((p.comportamenti || []).join('\n')) + '</textarea></div>' +
            '<div class="campo"><label for="p-c">Conseguenze, una per riga</label><textarea id="p-c">' + esc((p.conseguenze || []).join('\n')) + '</textarea></div>';
        default: return '';
      }
    }

    function aggiornaTipo(form) {
      var tipo = form.querySelector('#t-tipo').value;
      var def = M.TIPI[tipo];
      var p = tipo === bozza.metodo.tipo ? bozza.metodo.parametri : JSON.parse(JSON.stringify(def.parametri));
      form.querySelector('#t-tipo-aiuto').textContent = def.descrizione + '. Sul telefono: ' + def.strumentoNome.toLowerCase() + '.';
      form.querySelector('#t-parametri').innerHTML = parametriHtml(tipo, p);
      form.querySelector('#t-unita').textContent = '(' + def.unita + ')';
    }
    function aggiornaCriterio(form) {
      form.querySelector('#t-criterio').hidden = !form.querySelector('#t-usa-criterio').checked;
    }

    var linee = function (txt) { return txt.split('\n').map(function (x) { return x.trim(); }).filter(Boolean); };

    U.finestra(nuovo ? 'Nuovo target in “' + pr.nome + '”' : 'Modifica target', html, [
      { testo: 'Annulla', valore: null },
      { testo: nuovo ? 'Aggiungi target' : 'Salva', classe: 'btn-primario', valore: true, invio: true }
    ], {
      larga: true,
      dopo: function (form) {
        aggiornaTipo(form); aggiornaCriterio(form);
        form.querySelector('#t-tipo').addEventListener('change', function () { aggiornaTipo(form); });
        form.querySelector('#t-usa-criterio').addEventListener('change', function () { aggiornaCriterio(form); });
      },
      valida: function (form) {
        var nome = form.querySelector('#t-nome');
        if (!nome.value.trim()) { nome.focus(); return false; }
        return true;
      }
    }).then(function (r) {
      if (!r) return;
      var f = r.form;
      var q = function (sel) { var el = f.querySelector(sel); return el ? el.value : ''; };
      var tipo = q('#t-tipo');
      var parametri = {};
      if (/intervallo|momentaneo/.test(tipo)) parametri = { intervalloSec: +q('#p-int') || 10, osservazioneMin: +q('#p-oss') || 5 };
      if (tipo === 'dtt') parametri = { prove: +q('#p-prove') || 10 };
      if (tipo === 'task_analysis') parametri = { passi: linee(q('#p-passi')) };
      if (tipo === 'abc') parametri = { antecedenti: linee(q('#p-a')), comportamenti: linee(q('#p-b')), conseguenze: linee(q('#p-c')) };

      var cambioMisura = tipo !== bozza.metodo.tipo || JSON.stringify(parametri) !== JSON.stringify(bozza.metodo.parametri);
      bozza.nome = q('#t-nome').trim();
      bozza.direzione = q('#t-direzione');
      bozza.definizione = { include: q('#t-include'), esclude: q('#t-esclude'), esempi: q('#t-esempi') };
      if (!nuovo && cambioMisura) {
        bozza.metodo.storico = (bozza.metodo.storico || []).concat([{
          versione: bozza.metodo.versione, tipo: bozza.metodo.tipo, parametri: bozza.metodo.parametri
        }]);
        bozza.metodo.versione += 1;
      }
      bozza.metodo.tipo = tipo;
      bozza.metodo.parametri = parametri;
      bozza.metodo.criterio = f.querySelector('#t-usa-criterio').checked
        ? { soglia: +q('#t-soglia') || 0, verso: q('#t-verso'), sessioni: +q('#t-sessioni') || 3 }
        : null;

      if (nuovo) {
        pr.target.push(bozza);
        corrente().schedule.voci.push({ targetId: bozza.id });
        U.toast('Target aggiunto anche alla seduta');
      } else {
        var i = pr.target.findIndex(function (x) { return x.id === bozza.id; });
        pr.target[i] = bozza;
        U.toast(cambioMisura ? 'Salvato: metodo alla versione ' + bozza.metodo.versione : 'Target salvato');
      }
      salva();
    });
  }

  function nuovoProgramma(s) {
    var html = '<div class="modulo">' +
      '<div class="campo"><label for="p-nome">Nome del programma</label><input id="p-nome" type="text" required placeholder="Es. Comunicazione funzionale"></div>' +
      '<div class="campo"><label for="p-area">Area</label><select id="p-area"><option value="insegnare">Abilità da insegnare</option><option value="ridurre">Comportamento da ridurre</option></select></div>' +
      '<p class="tenue piccolo">Il programma parte in baseline da oggi. Poi aggiungi i target.</p></div>';
    U.finestra('Nuovo programma', html, [
      { testo: 'Annulla', valore: null },
      { testo: 'Crea programma', classe: 'btn-primario', valore: true, invio: true }
    ], {
      valida: function (f) { var n = f.querySelector('#p-nome'); if (!n.value.trim()) { n.focus(); return false; } return true; }
    }).then(function (r) {
      if (!r) return;
      var pr = {
        id: M.nuovoId('pr'), nome: r.form.querySelector('#p-nome').value.trim(), area: r.form.querySelector('#p-area').value,
        stato: 'attivo', fasi: [{ id: M.nuovoId('fa'), tipo: 'baseline', inizio: BR.datiFinti.dataISO(new Date()), nota: '' }], target: []
      };
      s.programmi.push(pr);
      salva();
      modificaTarget(pr, null);
    });
  }

  function rinominaProgramma(pr) {
    U.finestra('Rinomina programma', '<div class="campo"><label for="p-nome">Nome</label><input id="p-nome" type="text" value="' + esc(pr.nome) + '"></div>', [
      { testo: 'Annulla', valore: null },
      { testo: 'Salva', classe: 'btn-primario', valore: true, invio: true }
    ]).then(function (r) {
      if (!r) return;
      var n = r.form.querySelector('#p-nome').value.trim();
      if (n) { pr.nome = n; salva(); }
    });
  }

  function cambiaFase(pr, proposta) {
    var attuale = A.faseCorrente(pr);
    var opzioni = Object.keys(M.FASI).filter(function (k) { return k !== attuale; });
    var scelta = proposta && opzioni.indexOf(proposta) !== -1 ? proposta : opzioni[0];
    var html = '<div class="modulo"><p>Fase attuale di “' + esc(pr.nome) + '”: <strong>' + esc(M.FASI[attuale]) + '</strong>.</p>' +
      '<div class="campo"><label for="f-tipo">Nuova fase</label><select id="f-tipo">' + opzioni.map(function (k) {
        return '<option value="' + k + '"' + (k === scelta ? ' selected' : '') + '>' + M.FASI[k] + '</option>';
      }).join('') + '</select></div>' +
      '<div class="campo"><label for="f-nota">Nota sul cambio</label><input id="f-nota" type="text" placeholder="Es. criterio raggiunto il ' + U.data(Date.now()) + '"></div>' +
      '<p class="tenue piccolo">Parte da oggi. Sui grafici compare una linea tratteggiata prima della prossima sessione.</p></div>';
    U.finestra('Cambia fase', html, [
      { testo: 'Annulla', valore: null },
      { testo: 'Cambia fase', classe: 'btn-primario', valore: true, invio: true }
    ]).then(function (r) {
      if (!r) return;
      var tipo = r.form.querySelector('#f-tipo').value;
      pr.fasi.push({ id: M.nuovoId('fa'), tipo: tipo, inizio: BR.datiFinti.dataISO(new Date()), nota: r.form.querySelector('#f-nota').value });
      salva();
      U.toast('“' + pr.nome + '” passa a ' + M.FASI[tipo].toLowerCase());
    });
  }

  function nuovoPaziente() {
    var html = '<div class="modulo"><div class="campi-riga">' +
      '<div class="campo"><label for="n-codice">Codice</label><input id="n-codice" type="text" required placeholder="PZ-040"></div>' +
      '<div class="campo"><label for="n-iniziali">Iniziali</label><input id="n-iniziali" type="text" placeholder="A.B."></div>' +
      '<div class="campo"><label for="n-anno">Anno di nascita</label><input id="n-anno" type="number" min="1940" max="2026" value="2019"></div></div>' +
      '<div class="campo"><label for="n-note">Note</label><textarea id="n-note"></textarea></div>' +
      '<p class="tenue piccolo">Solo un codice pseudonimo: i dati anagrafici veri restano fuori dalla piattaforma.</p></div>';
    U.finestra('Nuovo paziente', html, [
      { testo: 'Annulla', valore: null },
      { testo: 'Crea paziente', classe: 'btn-primario', valore: true, invio: true }
    ], {
      larga: true,
      valida: function (f) { var n = f.querySelector('#n-codice'); if (!n.value.trim()) { n.focus(); return false; } return true; }
    }).then(function (r) {
      if (!r) return;
      var f = r.form;
      var s = {
        id: M.nuovoId('sg'), codice: f.querySelector('#n-codice').value.trim(), iniziali: f.querySelector('#n-iniziali').value.trim(),
        annoNascita: +f.querySelector('#n-anno').value || 2019, note: f.querySelector('#n-note').value.trim(),
        operatori: [stato.operatoreCorrente], programmi: [],
        schedule: { id: M.nuovoId('sc'), nome: 'Seduta standard', durataMin: 30, setting: 'Studio', voci: [] }
      };
      stato.config.soggetti.push(s);
      vista.soggettoId = s.id;
      vista.scheda = 'programmi';
      U.preferenza('desktop-paziente', s.id);
      salva();
    });
  }

  // ---- Eventi ---------------------------------------------------------------

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-azione]');
    if (!b) return;
    var s = corrente();
    var az = b.getAttribute('data-azione');
    var pr = b.getAttribute('data-programma') ? s.programmi.find(function (p) { return p.id === b.getAttribute('data-programma'); }) : null;
    switch (az) {
      case 'scegli-paziente':
        vista.soggettoId = b.getAttribute('data-id');
        vista.sessioneAperta = null;
        U.preferenza('desktop-paziente', vista.soggettoId);
        disegna();
        break;
      case 'scheda':
        vista.scheda = b.getAttribute('data-id');
        U.preferenza('desktop-scheda', vista.scheda);
        disegna();
        break;
      case 'tabella':
        vista.tabelle[b.getAttribute('data-id')] = !vista.tabelle[b.getAttribute('data-id')];
        disegna();
        break;
      case 'nuovo-paziente': nuovoPaziente(); break;
      case 'nuovo-programma': nuovoProgramma(s); break;
      case 'modifica-programma': rinominaProgramma(pr); break;
      case 'cambia-fase': cambiaFase(pr, b.getAttribute('data-fase')); break;
      case 'nuovo-target': modificaTarget(pr, null); break;
      case 'modifica-target':
        modificaTarget(pr, pr.target.find(function (t) { return t.id === b.getAttribute('data-id'); }));
        break;
      case 'sposta': {
        var voci = s.schedule.voci;
        var i = voci.findIndex(function (v) { return v.targetId === b.getAttribute('data-id'); });
        var j = i + +b.getAttribute('data-verso');
        if (i < 0 || j < 0 || j >= voci.length) return;
        var tmp = voci[i]; voci[i] = voci[j]; voci[j] = tmp;
        salva();
        break;
      }
      case 'togli-voce':
        s.schedule.voci = s.schedule.voci.filter(function (v) { return v.targetId !== b.getAttribute('data-id'); });
        salva();
        break;
      case 'aggiungi-voce': {
        var sel = document.getElementById('sc-aggiungi');
        if (sel && sel.value) { s.schedule.voci.push({ targetId: sel.value }); salva(); }
        break;
      }
      case 'apri-sessione':
        vista.sessioneAperta = vista.sessioneAperta === b.getAttribute('data-id') ? null : b.getAttribute('data-id');
        disegna();
        break;
      case 'ripristina':
        U.conferma('Ripristinare i dati finti?', 'Le modifiche fatte in questo browser, comprese le sedute registrate dal telefono, verranno cancellate.', 'Ripristina', 'btn-primario')
          .then(function (ok) {
            if (!ok) return;
            stato = A.ripristina();
            vista.soggettoId = stato.config.soggetti[0].id;
            disegna();
            U.toast('Dati finti ripristinati');
          });
        break;
    }
  });

  document.addEventListener('change', function (e) {
    var campo = e.target.getAttribute && e.target.getAttribute('data-campo-schedule');
    if (!campo) return;
    var sc = corrente().schedule;
    sc[campo] = campo === 'durataMin' ? Math.max(5, +e.target.value || sc.durataMin) : e.target.value;
    A.salva(stato);
    U.toast('Seduta aggiornata');
  });

  // Aggiorna la pagina quando il telefono (in un'altra scheda) registra o sincronizza.
  A.ascolta(function (nuovo) {
    if (!nuovo) return;
    stato = nuovo;
    if (!A.soggetto(stato, vista.soggettoId)) vista.soggettoId = stato.config.soggetti[0].id;
    if (!document.querySelector('.velo')) disegna();
  });

  G.attivaSuggerimenti(document.getElementById('principale'));
  disegna();
})();
