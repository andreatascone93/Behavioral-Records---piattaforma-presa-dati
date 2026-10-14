/*
 * Prototipo desktop: configurazione per paziente (programmi, target, metodi
 * di misura, schedule di seduta) e grafici secondo le convenzioni ABA.
 */
BR.archivio.avvia().then(function (statoIniziale) {
  'use strict';

  var M = BR.modello, A = BR.archivio, G = BR.grafico, U = BR.ui, P = BR.piano, D = BR.desktopPiano, DP = BR.desktopPreferenze, F = BR.fedelta, R = BR.repertorio, DR = BR.desktopRepertorio, DS = BR.desktopSeduta, Sd = BR.seduta;
  var esc = U.esc;

  var stato = statoIniziale;
  var vista = {
    soggettoId: U.preferenza('desktop-paziente'),
    scheda: U.preferenza('desktop-scheda') || 'grafici',
    sessioneAperta: null,
    tabelle: {},
    contesti: {}
  };
  if (!A.soggetto(stato, vista.soggettoId)) vista.soggettoId = stato.config.soggetti[0].id;

  var SCHEDE = [
    { id: 'grafici', nome: 'Grafici' },
    { id: 'programmi', nome: 'Programmi e target' },
    { id: 'repertorio', nome: 'Repertorio' },
    { id: 'protocolli', nome: 'Protocolli' },
    { id: 'piano', nome: 'Piano di intervento' },
    { id: 'preferenze', nome: 'Preferenze' },
    { id: 'schedule', nome: 'Schedule di seduta' },
    { id: 'sessioni', nome: 'Sessioni' }
  ];

  function salva() { A.salva(stato); disegna(); }
  var ctxPiano = {
    salva: function () { salva(); },
    soggetto: function () { return corrente(); },
    operatore: function (id) { return A.operatore(stato, id); }
  };
  function corrente() { return A.soggetto(stato, vista.soggettoId); }

  // ---- Barra e elenco pazienti ----------------------------------------------

  function disegnaStatoSync() {
    var el = document.getElementById('stato-sync');
    var cloud = A.cloudAttivo();
    document.querySelector('[data-azione="ripristina"]').hidden = cloud;
    document.getElementById('nota-dati').textContent = cloud
      ? 'Le modifiche si sincronizzano con il cloud dello studio.'
      : 'Dati di esempio. Senza cloud le modifiche restano solo in questo browser.';
    if (cloud) {
      var et = BR.pannelloCloud.etichetta(BR.cloud.info());
      el.className = 'pillola ' + et.classe;
      el.textContent = et.testo;
      el.title = '';
      return;
    }
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
    var fuoco = U.chiaveFuoco(main);
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
        grafici: vistaGrafici, programmi: vistaProgrammi, piano: D.vista, preferenze: function (x) { return DP.vista(x, stato); },
        repertorio: function (x) { return DR.vistaRepertorio(x, stato); }, protocolli: function (x) { return DR.vistaProtocolli(x, stato); }, schedule: vistaSchedule, sessioni: vistaSessioni
      }[vista.scheda] || vistaGrafici)(s) + '</div>';
    main.innerHTML = html;
    U.rimettiFuoco(main, fuoco);
  }

  function pillolaCriterio(c) {
    if (!c) return '<span class="pillola">Senza criterio</span>';
    if (c.raggiunto) return '<span class="pillola bene">Criterio raggiunto</span>';
    if (c.fase === 'baseline') return '<span class="pillola">In baseline</span>';
    if (c.consecutive > 0) return '<span class="pillola attenzione">' + esc(M.statoCriterioBreve(c)) + '</span>';
    return '<span class="pillola">Sotto criterio</span>';
  }

  // Dati del grafico di un target: serie, criterio e punti da disegnare.
  function datiGrafico(s, pr, t) {
    var tutti = A.serie(stato, s, pr, t, { soloSincronizzate: true });
    var criterio = A.criterioCorrente(pr, t);
    // Con la scaletta, il grafico può mostrare i soli probe o il solo insegnamento.
    var conContesti = Sd.discreto(t) && tutti.some(function (p) { return p.perContesto && (p.perContesto.probe || p.perContesto.insegnamento); });
    var contesto = !conContesti ? '' : vista.contesti[t.id] != null ? vista.contesti[t.id] : (criterio && criterio.contesto) || '';
    return {
      t: t, tutti: tutti, c: A.statoCriterio(pr, t, tutti), criterio: criterio, tipo: M.TIPI[t.metodo.tipo],
      conContesti: conContesti, contesto: contesto,
      punti: contesto ? Sd.serieNelContesto(tutti, contesto) : tutti,
      criterioSulGrafico: altroValore(criterio) || (criterio && (criterio.contesto || '') !== contesto) ? null : criterio
    };
  }

  // Stessa scala verticale per i target del programma con la stessa unità:
  // problema e comportamento sostitutivo si confrontano a colpo d'occhio
  // (standard di Kubina et al., 2017; vedi docs/design-esperienza-utente.md).
  function massimiPerUnita(dati) {
    var massimi = {};
    dati.forEach(function (d) {
      var m = d.criterioSulGrafico ? d.criterioSulGrafico.soglia : 0;
      d.punti.forEach(function (p) { if (p.valore != null && p.valore > m) m = p.valore; });
      massimi[d.tipo.unita] = Math.max(massimi[d.tipo.unita] || 0, m);
    });
    return massimi;
  }

  // Grafici: un grafico per target, raggruppati per programma.
  function vistaGrafici(s) {
    if (!s.programmi.length) return vuoto('Nessun programma per questo paziente.', 'Crea il primo programma nella scheda Programmi e target.');
    return s.programmi.map(function (pr) {
      var fase = A.faseCorrente(pr);
      var prossima = P.prossimaFase(pr);
      var dati = pr.target.map(function (t) { return datiGrafico(s, pr, t); });
      var massimi = massimiPerUnita(dati);
      var carte = dati.map(function (d) {
        var t = d.t, tutti = d.tutti, c = d.c, criterio = d.criterio, tipo = d.tipo;
        var conContesti = d.conContesti, contesto = d.contesto, punti = d.punti, criterioSulGrafico = d.criterioSulGrafico;
        var ultimo = punti.length ? punti[punti.length - 1] : null;
        var chiaveTab = t.id;
        var tabella = vista.tabelle[chiaveTab];
        var extra = '';
        if (t.metodo.tipo === 'dtt' && ultimo) extra = distribuzionePrompt(punti);
        if (t.metodo.tipo === 'abc') extra = combinazioniABC(punti);
        return '<article class="carta-grafico">' +
          '<div class="carta-testa">' +
            '<div><h3>' + esc(t.nome) + '</h3>' +
            '<p class="tenue piccolo">' + esc(tipo.nome) + ' · ' + esc(M.descriviCriterio(criterio, t.metodo.tipo)) +
              (t.protocollo ? ' · ' + esc((t.protocollo.nomeManuale || t.protocollo.manuale) + ' ' + t.protocollo.codice) : '') + '</p></div>' +
            '<div class="carta-valore"><span class="dato grande">' + (ultimo ? M.formatta(ultimo.valore, t.metodo.tipo) : '–') + '</span>' +
            '<span class="tenue piccolo">' + esc(tipo.unita) + ' · ultima</span></div>' +
          '</div>' +
          '<div class="carta-stato">' + pillolaCriterio(c) +
            '<span class="pillola senza-punto ruolo-' + (t.ruolo || 'abilita') + '">' + esc((P.RUOLI[t.ruolo] || P.RUOLI.abilita).breve) + '</span>' +
          '</div>' +
          (c && c.raggiunto && prossima
            ? '<div class="proposta"><span>Il criterio è raggiunto. Vuoi passare a “' + esc(prossima.nome) + '”?</span>' +
              '<button class="btn btn-primario" type="button" data-azione="avvia-fase-piano" data-programma="' + pr.id + '" data-id="' + prossima.id + '">Avvia la fase</button></div>'
            : c && c.raggiunto && fase === 'intervento'
            ? '<div class="proposta"><span>Il criterio è raggiunto. Vuoi passare alla fase di mantenimento?</span>' +
              '<button class="btn btn-primario" type="button" data-azione="cambia-fase" data-programma="' + pr.id + '" data-fase="t:mantenimento">Passa a mantenimento</button></div>'
            : '') +
          (R.elementi(t) ? DR.cartaElementi(s, pr, t, tutti, criterio) : '') +
          (conContesti ? sceltaContesto(t.id, contesto, criterio) : '') +
          // Se il criterio usa un altro valore (livello di prompt, prima prova),
          // la sua linea non va sul grafico delle risposte indipendenti.
          '<div class="grafico-box">' + G.aba({ punti: punti, tipo: t.metodo.tipo, criterio: criterioSulGrafico, titolo: t.nome, massimo: massimi[tipo.unita], larghezza: 600, altezza: 375 }) + '</div>' +
          (punti.escluse ? '<p class="tenue piccolo">' + punti.escluse + (punti.escluse === 1 ? ' sessione registrata' : ' sessioni registrate') + ' con un tipo di misura precedente non ' + (punti.escluse === 1 ? 'è' : 'sono') + ' nel grafico.</p>' : '') +
          extra +
          '<button class="btn btn-piatto piccolo" type="button" data-azione="tabella" data-id="' + chiaveTab + '">' + (tabella ? 'Nascondi i valori' : 'Mostra i valori in tabella') + '</button>' +
          (tabella ? tabellaValori(punti, t, criterio && !criterioSulGrafico ? criterio : null) : '') +
        '</article>';
      }).join('');
      var regole = A.regoleFase(stato, s, pr, { soloSincronizzate: true });
      var precedente = P.fasePrecedente(pr);
      return '<section class="gruppo">' +
        '<div class="gruppo-testa"><h2>' + esc(pr.nome) + '</h2>' +
        '<span class="pillola penna">Fase: ' + esc(A.nomeFaseCorrente(pr)) + '</span></div>' +
        pannelloFedelta(s, pr) +
        (regole.ritorno && precedente
          ? '<div class="proposta ritorno"><span>Regola di ritorno superata: i dati indicano di tornare a “' + esc(precedente.nome) + '”.</span>' +
            '<button class="btn" type="button" data-azione="avvia-fase-piano" data-programma="' + pr.id + '" data-id="' + precedente.id + '">Torna alla fase</button></div>'
          : '') +
        (regole.stallo
          ? '<div class="proposta stallo"><span>' + regole.sessioni + ' sessioni in questa fase senza criteri raggiunti: rivedi il programma (prompt, rinforzatore, schema).</span>' +
            '<button class="btn" type="button" data-azione="scheda" data-id="piano">Apri il piano</button></div>'
          : '') +
        (carte ? '<div class="griglia-grafici">' + carte + '</div>' : '<p class="tenue">Nessun target in questo programma.</p>') +
      '</section>';
    }).join('');
  }

  // Fedeltà del trattamento nelle sedute del programma: ultima seduta, media
  // recente, andamento e dettaglio per conseguenza.
  function pannelloFedelta(s, pr) {
    var serie = F.serie(stato, s, pr, { soloSincronizzate: true });
    if (!serie.length) return '';
    var ultime = serie.slice(-10);
    var ultima = serie[serie.length - 1];
    var sotto = ultima.percentuale < F.SOGLIA;
    return '<div class="fedelta-pannello' + (sotto ? ' sotto' : '') + '">' +
      '<div class="fedelta-testo"><span class="etichetta">Fedeltà del trattamento</span>' +
        '<p class="piccolo">Ultima seduta <strong class="dato">' + F.formatta(ultima.percentuale) + '</strong> (' + ultima.corrette + ' su ' + ultima.opportunita + ' occasioni, ' + esc(F.descriviErrori(ultima)) + ')' +
        ' · media delle ultime ' + ultime.length + ': <span class="dato">' + F.formatta(M.media(ultime.map(function (x) { return x.percentuale; }))) + '</span></p>' +
        (sotto ? '<p class="piccolo">Sotto il ' + F.SOGLIA + '%: prima di cambiare il piano, verifica come viene applicato (istruzioni e feedback all’operatore).</p>' : '') +
        '<details class="piccolo"><summary>Dettaglio dell’ultima seduta (' + esc(ultima.faseNome) + ')</summary><ul>' + ultima.righe.map(function (x) {
          return '<li><strong>' + esc(x.sigla) + '</strong> ' + (x.valutabile
            ? (x.opportunita ? F.formatta(x.percentuale) + ', ' + x.corrette + ' su ' + x.opportunita + ', ' + esc(F.descriviErrori(x)) : 'nessuna occasione')
            : '<span class="tenue">' + esc(x.nota) + '</span>') + '</li>';
        }).join('') + '</ul></details>' +
      '</div>' +
      '<div class="fedelta-mini" title="Fedeltà nelle ultime ' + ultime.length + ' sedute; la linea è il ' + F.SOGLIA + '%">' +
        G.mini(ultime.map(function (x) { return x.percentuale; }), { max: 100, soglia: F.SOGLIA, larghezza: 160, altezza: 44 }) + '</div>' +
    '</div>';
  }

  // Tutte le prove, solo probe, solo insegnamento: quale serie disegnare.
  function sceltaContesto(id, contesto, criterio) {
    var voci = [['', 'Tutte le prove'], ['probe', 'Solo probe'], ['insegnamento', 'Solo insegnamento']];
    return '<div class="segmenti" role="group" aria-label="Dati da mostrare">' + voci.map(function (v) {
      var sel = v[0] === contesto;
      var delCriterio = criterio && (criterio.contesto || '') === v[0] && criterio.contesto;
      return '<button type="button" class="segmento' + (sel ? ' sel' : '') + '" aria-pressed="' + sel + '" data-azione="contesto-grafico" data-id="' + id + '" data-contesto="' + v[0] + '"' +
        (delCriterio ? ' title="Il criterio si valuta su questi dati"' : '') + '>' + v[1] + (delCriterio ? ' ★' : '') + '</button>';
    }).join('') + '</div>';
  }

  function altroValore(criterio) {
    return !!criterio && ((criterio.livelloPrompt && criterio.livelloPrompt !== 'I') || !!criterio.primaProva);
  }

  // criterio: se il criterio usa un valore diverso dalla misura, una colonna in
  // più con il valore che conta per il criterio.
  function tabellaValori(punti, t, criterio) {
    return '<div class="tabella-box"><table class="tabella"><thead><tr><th>Sessione</th><th>Data</th><th>Fase</th><th class="num">' + esc(M.TIPI[t.metodo.tipo].unita) + '</th>' +
      (criterio ? '<th class="num">Per il criterio</th>' : '') + '</tr></thead><tbody>' +
      punti.map(function (p, i) {
        return '<tr><td class="dato">' + (i + 1) + '</td><td>' + U.data(p.sessione.inizio) + '</td><td>' + esc(p.faseNome) + '</td><td class="num dato">' + M.formatta(p.valore, t.metodo.tipo) + '</td>' +
          (criterio ? '<td class="num dato">' + M.formatta(M.valoreCriterio(criterio, t.metodo.tipo, p), t.metodo.tipo) + '</td>' : '') + '</tr>';
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
          return '<li class="' + (ultima ? 'corrente' : '') + '"><span class="fase-nome">' + esc(P.nomeFase(pr, f)) + '</span>' +
            '<span class="tenue piccolo">dal ' + U.data(new Date(f.inizio + 'T12:00:00').getTime()) + (ultima ? ' · in corso' : '') + '</span></li>';
        }).join('') + '</ol>' +
        '<div class="tabella-box"><table class="tabella target"><thead><tr><th>Target</th><th>Ruolo</th><th>Misura</th><th>Sul telefono</th><th>Criterio</th><th></th></tr></thead><tbody>' +
        pr.target.map(function (t) {
          var tipo = M.TIPI[t.metodo.tipo];
          var ruolo = P.RUOLI[t.ruolo] || P.RUOLI.abilita;
          var funz = t.ruolo === 'problema' ? P.descriviFunzione(t) : '';
          return '<tr><td><strong>' + esc(t.nome) + '</strong><div class="tenue piccolo definizione">' + esc(t.definizione.include || '') + '</div></td>' +
            '<td><span class="pillola senza-punto ruolo-' + (t.ruolo || 'abilita') + '">' + esc(ruolo.breve) + '</span>' + (funz ? '<div class="tenue piccolo">Funzione: ' + esc(funz.toLowerCase()) + '</div>' : '') + '</td>' +
            '<td>' + esc(tipo.nome) + parametriBrevi(t.metodo) + '<div class="tenue piccolo">versione ' + t.metodo.versione + '</div>' + DR.riassuntoTabella(s, pr, t) + '</td>' +
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
    var mini = DS.anteprima(s);
    return '<div class="schedule">' +
      '<div class="schedule-colonna">' +
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
      DS.vista(s) +
      '</div>' +
      '<aside class="anteprima" aria-label="Anteprima sul telefono">' +
        '<span class="etichetta">Così la vede il telefono</span>' +
        '<div class="telefono-mini">' +
          '<div class="tm-testa"><span class="dato">' + esc(s.codice) + '</span><span class="dato">00:00</span></div>' +
          (mini || dentro.map(function (x) {
            return '<div class="tm-voce"><span>' + esc(x.target.nome) + '</span><span class="tm-strumento">' + esc(M.TIPI[x.target.metodo.tipo].strumentoNome) + '</span></div>';
          }).join('')) +
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
    return DS.svolti(s, sess, ev) + fedeltaSessione(s, sess, ev) + elencoEventi(s, sess, ev);
  }

  function fedeltaSessione(s, sess, ev) {
    if (!sess.fine) return '';
    var righe = s.programmi.map(function (pr) {
      var voce = A.voceDiSessione(pr, sess);
      var fase = voce && voce.pianoId ? P.fasePianificata(pr, voce.pianoId) : null;
      var r = F.seduta(fase, pr.target, ev, sess);
      if (r.percentuale == null) return '';
      return '<li>' + esc(pr.nome) + ': <strong class="dato">' + F.formatta(r.percentuale) + '</strong> (' + r.corrette + ' su ' + r.opportunita + ', ' + esc(F.descriviErrori(r)) + ')</li>';
    }).join('');
    return righe ? '<div class="fedelta-sessione"><span class="etichetta">Fedeltà del trattamento</span><ul>' + righe + '</ul></div>' : '';
  }

  function elencoEventi(s, sess, ev) {
    var annullati = {};
    ev.forEach(function (e) { if (e.tipo === 'annulla') annullati[e.rif] = true; });
    var ord = ev.slice().sort(function (a, b) { return a.t - b.t; });
    return '<div class="registro">' + ord.map(function (e) {
      var x = A.trovaTarget(s, e.targetId);
      return '<div class="ev' + (annullati[e.id] ? ' annullato' : '') + (e.tipo === 'annulla' ? ' correzione' : '') + '">' +
        '<span class="dato tenue">' + U.mmss(e.t - sess.inizio) + '</span>' +
        '<span>' + esc(x ? x.target.nome : '?') + '</span>' +
        '<span class="dato">' + esc(e.tipo === 'conseguenza' ? P.descriviEventoConseguenza(e, contingenza(s, e.valore && e.valore.contingenzaId)) : descriviEvento(e)) +
          (Sd.CONTESTI[e.contesto] && e.tipo !== 'annulla' ? ' <span class="tenue">· ' + esc(Sd.CONTESTI[e.contesto].toLowerCase()) + '</span>' : '') + '</span>' +
        (e.sincronizzato ? '' : '<span class="pillola attenzione">da inviare</span>') + '</div>';
    }).join('') + '</div>';
  }

  function contingenza(s, id) {
    var trovata = null;
    s.programmi.forEach(function (pr) {
      ((pr.piano && pr.piano.fasi) || []).forEach(function (f) {
        (f.contingenze || []).forEach(function (c) { if (c.id === id) trovata = c; });
      });
    });
    return trovata;
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

  // Livello di prompt fino al quale una risposta conta per il criterio.
  var LIVELLI_CRITERIO = [
    ['I', 'Solo indipendenti'],
    ['V', 'Fino al prompt verbale'],
    ['G', 'Fino al prompt gestuale'],
    ['M', 'Fino al modello'],
    ['FP', 'Fino al fisico parziale']
  ];

  // Su quali prove si valuta il criterio, se la seduta ha una scaletta.
  var CONTESTI_CRITERIO = [
    ['', 'Tutte le prove'], ['probe', 'Solo i probe della scaletta'], ['insegnamento', 'Solo le prove di insegnamento']
  ];

  // Criterio dal modulo del target, con le richieste in più solo dove servono.
  function leggiCriterio(form) {
    var q = function (sel) { return form.querySelector(sel); };
    var tipo = q('#t-tipo').value;
    var c = { soglia: +q('#t-soglia').value || 0, verso: q('#t-verso').value, sessioni: +q('#t-sessioni').value || 3 };
    var livello = q('#t-livello').value;
    if ((tipo === 'dtt' || tipo === 'task_analysis') && livello !== 'I') c.livelloPrompt = livello;
    // Sulla prima prova il valore è 100 (corretta) o 0: il criterio è "corretta".
    if (tipo === 'dtt' && q('#t-prima').checked) { c.primaProva = true; c.soglia = 100; c.verso = 'almeno'; }
    if (Sd.DISCRETE.indexOf(tipo) !== -1 && q('#t-contesto').value) c.contesto = q('#t-contesto').value;
    var op = Math.round(+q('#t-min-op').value || 1), set = Math.round(+q('#t-min-set').value || 1);
    if (op > 1) c.minOperatori = op;
    if (set > 1) c.minSetting = set;
    return c;
  }

  function modificaTarget(pr, t) {
    var nuovo = !t;
    var ruoloIniziale = pr.area === 'ridurre' ? 'problema' : 'abilita';
    var bozza = t ? JSON.parse(JSON.stringify(t)) : {
      id: M.nuovoId('tg'), nome: '', direzione: pr.area === 'ridurre' ? 'ridurre' : 'aumentare', ruolo: ruoloIniziale,
      definizione: { include: '', esclude: '', esempi: '', inizio: '', fine: '' },
      metodo: { id: M.nuovoId('me'), tipo: pr.area === 'ridurre' ? 'frequenza' : 'dtt', versione: 1, parametri: JSON.parse(JSON.stringify(M.TIPI[pr.area === 'ridurre' ? 'frequenza' : 'dtt'].parametri)), criterio: null }
    };
    bozza.ruolo = bozza.ruolo || (bozza.direzione === 'ridurre' ? 'problema' : 'abilita');
    var c = bozza.metodo.criterio;
    var def = bozza.definizione;
    var funz = bozza.funzione || { ipotesi: 'da_definire', fonti: [], certezza: 'ipotesi', note: '' };
    var ins = bozza.insegnamento || { formato: bozza.metodo.tipo === 'task_analysis' ? 'catena_totale' : 'dtt', istruzione: '', materiali: '', prompt: { strategia: 'meno_intrusivo', ritardoSec: 0, sfumatura: '' }, correzione: 'ripresenta_prompt', rinforzoDifferenziale: true };
    var gen = bozza.generalizzazione || { persone: [], luoghi: [], materiali: [] };
    var problemi = pr.target.filter(function (x) { return x.ruolo === 'problema' && x.id !== bozza.id; });
    var sel = function (id, mappa, v) {
      return '<select id="' + id + '">' + Object.keys(mappa).map(function (k) {
        var n = typeof mappa[k] === 'string' ? mappa[k] : mappa[k].nome;
        return '<option value="' + k + '"' + (k === v ? ' selected' : '') + '>' + esc(n) + '</option>';
      }).join('') + '</select>';
    };
    var html =
      '<div class="modulo">' +
        '<div class="campi-riga">' +
          '<div class="campo largo"><label for="t-nome">Nome del target</label><input id="t-nome" type="text" required value="' + esc(bozza.nome) + '" placeholder="Es. Chiede una pausa"></div>' +
          '<div class="campo"><label for="t-ruolo">Ruolo nel piano</label>' + sel('t-ruolo', P.RUOLI, bozza.ruolo) + '</div>' +
        '</div>' +
        '<p class="aiuto piccolo" id="t-ruolo-aiuto"></p>' +
        '<fieldset data-per="problema"><legend>Ipotesi di funzione</legend>' +
          '<div class="campi-riga">' +
            '<div class="campo"><label for="t-funzione">Funzione principale</label>' + sel('t-funzione', P.FUNZIONI, funz.ipotesi) + '</div>' +
            '<div class="campo"><label for="t-certezza">Certezza</label>' + sel('t-certezza', P.CERTEZZA, funz.certezza) + '</div>' +
          '</div>' +
          '<div class="campo"><span class="etichetta">Altre funzioni (controllo multiplo)</span><div class="spunte colonne">' + Object.keys(P.FUNZIONI).filter(function (k) { return k !== 'multipla' && k !== 'da_definire'; }).map(function (k) {
            return '<label class="spunta piccolo"><input type="checkbox" name="t-altre" value="' + k + '"' + ((funz.altre || []).indexOf(k) !== -1 ? ' checked' : '') + '> ' + esc(P.FUNZIONI[k].nome) + '</label>';
          }).join('') + '</div></div>' +
          '<label class="spunta piccolo"><input id="t-sintetizzata" type="checkbox"' + (funz.sintetizzata ? ' checked' : '') + '> Le funzioni operano insieme (contingenza sintetizzata, IISCA): il rinforzatore dell’alternativa le combina</label>' +
          '<div class="campo"><span class="etichetta">Come è stata valutata</span><div class="spunte">' + Object.keys(P.FONTI_VALUTAZIONE).map(function (k) {
            return '<label class="spunta piccolo"><input type="checkbox" name="t-fonti" value="' + k + '"' + ((funz.fonti || []).indexOf(k) !== -1 ? ' checked' : '') + '> ' + esc(P.FONTI_VALUTAZIONE[k]) + '</label>';
          }).join('') + '</div></div>' +
          '<div class="campo"><label for="t-funz-note">Dati a sostegno</label><textarea id="t-funz-note" placeholder="Es. sintesi delle schede ABC o dell’analisi funzionale">' + esc(funz.note || '') + '</textarea></div>' +
        '</fieldset>' +
        '<div class="campo" data-per="sostitutivo"><label for="t-sostituisce">Sostituisce il comportamento problema</label><select id="t-sostituisce"><option value="">Nessuno</option>' +
          problemi.map(function (x) { return '<option value="' + x.id + '"' + (bozza.sostituisce === x.id ? ' selected' : '') + '>' + esc(x.nome) + '</option>'; }).join('') +
          '</select><span class="aiuto">Il sostitutivo deve produrre lo stesso rinforzatore del problema, con meno sforzo.</span></div>' +
        '<fieldset><legend>Definizione operativa</legend>' +
          '<div class="campo"><label for="t-include">Cosa conta</label><textarea id="t-include">' + esc(def.include) + '</textarea></div>' +
          '<div class="campo"><label for="t-esclude">Cosa non conta</label><textarea id="t-esclude">' + esc(def.esclude) + '</textarea></div>' +
          '<div class="campi-riga">' +
            '<div class="campo"><label for="t-inizio">Quando inizia</label><input id="t-inizio" type="text" value="' + esc(def.inizio || '') + '"></div>' +
            '<div class="campo"><label for="t-fine">Quando finisce</label><input id="t-fine" type="text" value="' + esc(def.fine || '') + '"></div>' +
          '</div>' +
          '<div class="campo"><label for="t-esempi">Esempi</label><input id="t-esempi" type="text" value="' + esc(def.esempi) + '"></div>' +
        '</fieldset>' +
        '<fieldset data-per="abilita sostitutivo"><legend>Procedura di insegnamento</legend>' +
          '<div class="campi-riga">' +
            '<div class="campo"><label for="t-formato">Formato</label>' + sel('t-formato', P.FORMATI, ins.formato) + '</div>' +
            '<div class="campo"><label for="t-correzione">Correzione dell’errore</label>' + sel('t-correzione', P.CORREZIONI, ins.correzione) + '</div>' +
          '</div>' +
          '<div class="campo"><label for="t-istruzione">Istruzione o occasione (SD)</label><input id="t-istruzione" type="text" value="' + esc(ins.istruzione || '') + '" placeholder="Es. “Fai così” più il modello"></div>' +
          '<div class="campo"><label for="t-materiali">Materiali</label><input id="t-materiali" type="text" value="' + esc(ins.materiali || '') + '"></div>' +
          '<div class="campi-riga">' +
            '<div class="campo largo"><label for="t-strategia">Prompt e sfumatura</label>' + sel('t-strategia', P.STRATEGIE_PROMPT, ins.prompt.strategia) + '</div>' +
            '<div class="campo"><label for="t-ritardo">Ritardo del prompt (s)</label><input id="t-ritardo" type="number" min="0" value="' + (ins.prompt.ritardoSec || 0) + '"></div>' +
          '</div>' +
          '<div class="campo"><label for="t-sfumatura">Quando si riduce il prompt</label><input id="t-sfumatura" type="text" value="' + esc(ins.prompt.sfumatura || '') + '"></div>' +
          '<label class="spunta piccolo"><input id="t-diff" type="checkbox"' + (ins.rinforzoDifferenziale ? ' checked' : '') + '> Rinforzo più forte per le risposte indipendenti che per quelle con prompt</label>' +
        '</fieldset>' +
        '<fieldset><legend>Obiettivo</legend>' +
          '<div class="campo"><label for="t-condizione">In quale condizione</label><input id="t-condizione" type="text" value="' + esc(bozza.obiettivo && bozza.obiettivo.condizione || '') + '" placeholder="Es. durante il lavoro al tavolo, con l’istruzione…"></div>' +
          '<p class="piccolo obiettivo" id="t-obiettivo"></p>' +
        '</fieldset>' +
        '<fieldset><legend>Metodo di misura</legend>' +
          '<div class="campi-riga">' +
            '<div class="campo largo"><label for="t-tipo">Tipo di misura</label><select id="t-tipo">' +
            Object.keys(M.TIPI).map(function (k) {
              return '<option value="' + k + '"' + (k === bozza.metodo.tipo ? ' selected' : '') + '>' + esc(M.TIPI[k].nome) + '</option>';
            }).join('') + '</select><span class="aiuto" id="t-tipo-aiuto"></span></div>' +
            '<div class="campo"><label for="t-direzione">Il valore deve</label><select id="t-direzione">' +
              '<option value="aumentare"' + (bozza.direzione === 'aumentare' ? ' selected' : '') + '>Aumentare</option>' +
              '<option value="ridurre"' + (bozza.direzione === 'ridurre' ? ' selected' : '') + '>Diminuire</option></select></div>' +
          '</div>' +
          '<div id="t-parametri"></div>' +
        '</fieldset>' +
        DR.campiTarget(bozza) +
        '<fieldset><legend>Criterio di padronanza</legend>' +
          '<label class="spunta"><input id="t-usa-criterio" type="checkbox"' + (c ? ' checked' : '') + '> Usa un criterio</label>' +
          '<div class="campi-riga" id="t-criterio">' +
            '<div class="campo"><label for="t-verso">Valore</label><select id="t-verso"><option value="almeno"' + (c && c.verso === 'almeno' ? ' selected' : '') + '>almeno</option><option value="al_massimo"' + (c && c.verso === 'al_massimo' ? ' selected' : '') + '>al massimo</option></select></div>' +
            '<div class="campo"><label for="t-soglia">Soglia <span class="tenue" id="t-unita"></span></label><input id="t-soglia" type="number" step="any" min="0" value="' + (c ? c.soglia : 90) + '"></div>' +
            '<div class="campo"><label for="t-sessioni">Sessioni consecutive</label><input id="t-sessioni" type="number" min="1" max="10" value="' + (c ? c.sessioni : 3) + '"></div>' +
          '</div>' +
          '<div id="t-criterio-piu">' +
            '<div class="campi-riga">' +
              '<div class="campo" data-tipi="dtt task_analysis"><label for="t-livello">Risposte che contano</label><select id="t-livello">' +
                LIVELLI_CRITERIO.map(function (l) {
                  return '<option value="' + l[0] + '"' + (((c && c.livelloPrompt) || 'I') === l[0] ? ' selected' : '') + '>' + l[1] + '</option>';
                }).join('') + '</select></div>' +
              '<div class="campo" data-tipi="dtt task_analysis latenza"><label for="t-contesto">Prove che contano</label><select id="t-contesto">' +
                CONTESTI_CRITERIO.map(function (l) {
                  return '<option value="' + l[0] + '"' + (((c && c.contesto) || '') === l[0] ? ' selected' : '') + '>' + l[1] + '</option>';
                }).join('') + '</select></div>' +
              '<div class="campo"><label for="t-min-op">Operatori diversi, almeno</label><input id="t-min-op" type="number" min="1" max="6" value="' + ((c && c.minOperatori) || 1) + '"></div>' +
              '<div class="campo"><label for="t-min-set">Setting diversi, almeno</label><input id="t-min-set" type="number" min="1" max="6" value="' + ((c && c.minSetting) || 1) + '"></div>' +
            '</div>' +
            '<label class="spunta" data-tipi="dtt"><input id="t-prima" type="checkbox"' + (c && c.primaProva ? ' checked' : '') + '> Conta solo la prima prova del giorno (sondaggio a freddo)</label>' +
            '<p class="aiuto piccolo">Operatori e setting si contano tra le sessioni consecutive a criterio: con 2 operatori il criterio è raggiunto solo se almeno una di quelle sessioni l’ha condotta un altro operatore. La prima prova del giorno è più severa della percentuale su tutte le prove: tende a segnalare la padronanza più tardi (Lerman et al., 2011). Con “Solo i probe della scaletta” contano le sole sedute con un blocco di probe.</p>' +
          '</div>' +
        '</fieldset>' +
        '<fieldset data-per="abilita sostitutivo problema"><legend>Generalizzazione</legend>' +
          '<div class="campo"><label for="t-g-persone">Persone</label><input id="t-g-persone" type="text" value="' + esc((gen.persone || []).join(', ')) + '" placeholder="Separate da virgola"></div>' +
          '<div class="campi-riga">' +
            '<div class="campo"><label for="t-g-luoghi">Luoghi</label><input id="t-g-luoghi" type="text" value="' + esc((gen.luoghi || []).join(', ')) + '"></div>' +
            '<div class="campo"><label for="t-g-materiali">Materiali</label><input id="t-g-materiali" type="text" value="' + esc((gen.materiali || []).join(', ')) + '"></div>' +
          '</div>' +
        '</fieldset>' +
        (nuovo ? '' : '<p class="tenue piccolo">Se cambi il tipo o i parametri della misura, il metodo passa alla versione ' + (bozza.metodo.versione + 1) + '. Le sessioni già registrate restano legate alla versione con cui sono state raccolte.</p>') +
      '</div>';

    var AIUTO_RUOLO = {
      problema: 'Il comportamento da ridurre. Le conseguenze si progettano nella scheda Piano di intervento, in base alla funzione.',
      sostitutivo: 'Il comportamento che prende il posto del problema e ne ottiene lo stesso rinforzatore (es. la richiesta nella FCT).',
      abilita: 'Un’abilità da insegnare, con la sua procedura di insegnamento.',
      valutazione: 'Uno strumento di osservazione per formulare l’ipotesi di funzione (es. ABC): non riceve conseguenze programmate.'
    };
    function aggiornaRuolo(form, cambiato) {
      var ruolo = form.querySelector('#t-ruolo').value;
      form.querySelector('#t-ruolo-aiuto').textContent = AIUTO_RUOLO[ruolo];
      form.querySelectorAll('[data-per]').forEach(function (el) {
        el.hidden = el.getAttribute('data-per').split(' ').indexOf(ruolo) === -1;
      });
      if (cambiato && P.RUOLI[ruolo].direzione) form.querySelector('#t-direzione').value = P.RUOLI[ruolo].direzione;
    }
    function aggiornaObiettivo(form) {
      var crit = form.querySelector('#t-usa-criterio').checked
        ? M.descriviCriterio(leggiCriterio(form), form.querySelector('#t-tipo').value)
        : '';
      var testo = P.obiettivo({ nome: form.querySelector('#t-nome').value || 'target', obiettivo: { condizione: form.querySelector('#t-condizione').value } }, crit);
      form.querySelector('#t-obiettivo').textContent = testo ? 'Si legge così: ' + testo : '';
      // Con la prima prova del giorno soglia e verso non servono.
      var tipo = form.querySelector('#t-tipo').value;
      var prima = tipo === 'dtt' && form.querySelector('#t-prima').checked;
      form.querySelector('#t-soglia').disabled = prima;
      form.querySelector('#t-verso').disabled = prima;
      var livello = form.querySelector('#t-livello').value;
      form.querySelector('#t-unita').textContent = '(' + (prima ? '100 = prima prova corretta'
        : (tipo === 'dtt' || tipo === 'task_analysis') && livello !== 'I' ? (tipo === 'dtt' ? '% risposte corrette' : '% passi') + ' fino a ' + livello
        : M.TIPI[tipo].unita) + ')';
    }

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
      form.querySelectorAll('[data-tipi]').forEach(function (el) {
        el.hidden = el.getAttribute('data-tipi').split(' ').indexOf(tipo) === -1;
      });
    }
    function aggiornaCriterio(form) {
      var usa = form.querySelector('#t-usa-criterio').checked;
      form.querySelector('#t-criterio').hidden = !usa;
      form.querySelector('#t-criterio-piu').hidden = !usa;
    }

    var linee = function (txt) { return txt.split('\n').map(function (x) { return x.trim(); }).filter(Boolean); };

    U.finestra(nuovo ? 'Nuovo target in “' + pr.nome + '”' : 'Modifica target', html, [
      { testo: 'Annulla', valore: null },
      { testo: nuovo ? 'Aggiungi target' : 'Salva', classe: 'btn-primario', valore: true, invio: true }
    ], {
      larga: true,
      dopo: function (form) {
        aggiornaTipo(form); aggiornaCriterio(form); aggiornaRuolo(form, false); aggiornaObiettivo(form); DR.attivaCampi(form);
        form.querySelector('#t-tipo').addEventListener('change', function () { aggiornaTipo(form); });
        form.querySelector('#t-usa-criterio').addEventListener('change', function () { aggiornaCriterio(form); });
        form.querySelector('#t-ruolo').addEventListener('change', function () { aggiornaRuolo(form, true); });
        form.addEventListener('input', function () { aggiornaObiettivo(form); });
        form.addEventListener('change', function () { aggiornaObiettivo(form); });
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
      var virgole = function (txt) { return txt.split(',').map(function (x) { return x.trim(); }).filter(Boolean); };
      bozza.nome = q('#t-nome').trim();
      bozza.direzione = q('#t-direzione');
      bozza.ruolo = q('#t-ruolo');
      bozza.definizione = { include: q('#t-include'), esclude: q('#t-esclude'), esempi: q('#t-esempi'), inizio: q('#t-inizio'), fine: q('#t-fine') };
      bozza.obiettivo = { condizione: q('#t-condizione').trim() };
      delete bozza.funzione; delete bozza.sostituisce; delete bozza.insegnamento; delete bozza.generalizzazione;
      if (bozza.ruolo === 'problema') {
        bozza.funzione = {
          ipotesi: q('#t-funzione'), certezza: q('#t-certezza'), note: q('#t-funz-note').trim(),
          altre: Array.prototype.map.call(f.querySelectorAll('input[name="t-altre"]:checked'), function (x) { return x.value; })
            .filter(function (k) { return k !== q('#t-funzione'); }),
          sintetizzata: f.querySelector('#t-sintetizzata').checked,
          fonti: Array.prototype.map.call(f.querySelectorAll('input[name="t-fonti"]:checked'), function (x) { return x.value; })
        };
      }
      if (bozza.ruolo === 'sostitutivo' && q('#t-sostituisce')) bozza.sostituisce = q('#t-sostituisce');
      if (bozza.ruolo === 'abilita' || bozza.ruolo === 'sostitutivo') {
        bozza.insegnamento = {
          formato: q('#t-formato'), istruzione: q('#t-istruzione').trim(), materiali: q('#t-materiali').trim(),
          prompt: { strategia: q('#t-strategia'), ritardoSec: +q('#t-ritardo') || 0, sfumatura: q('#t-sfumatura').trim() },
          correzione: q('#t-correzione'), rinforzoDifferenziale: f.querySelector('#t-diff').checked
        };
      }
      if (bozza.ruolo !== 'valutazione') {
        bozza.generalizzazione = { persone: virgole(q('#t-g-persone')), luoghi: virgole(q('#t-g-luoghi')), materiali: virgole(q('#t-g-materiali')) };
      }
      if (!nuovo && cambioMisura) {
        bozza.metodo.storico = (bozza.metodo.storico || []).concat([{
          versione: bozza.metodo.versione, tipo: bozza.metodo.tipo, parametri: bozza.metodo.parametri
        }]);
        bozza.metodo.versione += 1;
      }
      bozza.metodo.tipo = tipo;
      bozza.metodo.parametri = parametri;
      bozza.metodo.criterio = f.querySelector('#t-usa-criterio').checked ? leggiCriterio(f) : null;
      DR.leggiTarget(f, bozza);

      if (nuovo) {
        pr.target.push(bozza);
        corrente().schedule.voci.push({ targetId: bozza.id });
        DS.targetAggiunto(corrente(), bozza.id);
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
      '<p class="tenue piccolo">Il programma parte in baseline da oggi. Poi aggiungi i target e, nella scheda Piano di intervento, le fasi con le conseguenze.</p></div>';
    U.finestra('Nuovo programma', html, [
      { testo: 'Annulla', valore: null },
      { testo: 'Crea programma', classe: 'btn-primario', valore: true, invio: true }
    ], {
      valida: function (f) { var n = f.querySelector('#p-nome'); if (!n.value.trim()) { n.focus(); return false; } return true; }
    }).then(function (r) {
      if (!r) return;
      var pr = {
        id: M.nuovoId('pr'), nome: r.form.querySelector('#p-nome').value.trim(), area: r.form.querySelector('#p-area').value,
        stato: 'attivo', target: [],
        piano: { modello: null, fasi: [{ id: M.nuovoId('pf'), tipo: 'baseline', nome: 'Baseline', descrizione: '', antecedenti: [], contingenze: [], criteri: {} }] }
      };
      pr.fasi = [{ id: M.nuovoId('fa'), tipo: 'baseline', inizio: BR.datiFinti.dataISO(new Date()), nota: '', pianoId: pr.piano.fasi[0].id }];
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

  // Valori: "p:<id>" per una fase del piano, "t:<tipo>" per una fase libera.
  function cambiaFase(pr, proposta) {
    var corrente = A.voceCorrente(pr);
    var prossima = P.prossimaFase(pr);
    var pianificate = (pr.piano && pr.piano.fasi || []).filter(function (f) { return !corrente || corrente.pianoId !== f.id; });
    var scelta = proposta || (prossima ? 'p:' + prossima.id : 't:' + Object.keys(M.FASI).filter(function (k) { return k !== A.faseCorrente(pr); })[0]);
    var opt = function (v, testo) { return '<option value="' + v + '"' + (v === scelta ? ' selected' : '') + '>' + esc(testo) + '</option>'; };
    var html = '<div class="modulo"><p>Fase attuale di “' + esc(pr.nome) + '”: <strong>' + esc(A.nomeFaseCorrente(pr)) + '</strong>.</p>' +
      '<div class="campo"><label for="f-tipo">Nuova fase</label><select id="f-tipo">' +
        (pianificate.length ? '<optgroup label="Fasi del piano">' + pianificate.map(function (f) { return opt('p:' + f.id, f.nome); }).join('') + '</optgroup>' : '') +
        '<optgroup label="Fase non pianificata">' + Object.keys(M.FASI).map(function (k) { return opt('t:' + k, M.FASI[k]); }).join('') + '</optgroup>' +
      '</select></div>' +
      '<div class="campo"><label for="f-nota">Nota sul cambio</label><input id="f-nota" type="text" placeholder="Es. criterio raggiunto il ' + U.data(Date.now()) + '"></div>' +
      '<p class="tenue piccolo">Parte da oggi. Sui grafici compare una linea tratteggiata prima della prossima sessione, e il telefono mostra le conseguenze della nuova fase.</p></div>';
    U.finestra('Cambia fase', html, [
      { testo: 'Annulla', valore: null },
      { testo: 'Cambia fase', classe: 'btn-primario', valore: true, invio: true }
    ]).then(function (r) {
      if (!r) return;
      var v = r.form.querySelector('#f-tipo').value;
      avviaFase(pr, v, r.form.querySelector('#f-nota').value);
    });
  }

  function avviaFase(pr, valore, nota) {
    var voce = { id: M.nuovoId('fa'), inizio: BR.datiFinti.dataISO(new Date()), nota: nota || '' };
    if (valore.slice(0, 2) === 'p:') {
      var f = P.fasePianificata(pr, valore.slice(2));
      if (!f) return;
      voce.tipo = f.tipo;
      voce.pianoId = f.id;
    } else {
      voce.tipo = valore.slice(2);
    }
    pr.fasi.push(voce);
    salva();
    U.toast('“' + pr.nome + '” passa a ' + P.nomeFase(pr, voce));
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
    if (DS.clic(ctxPiano, s, az, b)) return;
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
      case 'nuova-preferenza': DP.modifica(ctxPiano, s, null); break;
      case 'modifica-preferenza':
        DP.modifica(ctxPiano, s, (s.preferenze || []).find(function (v) { return v.id === b.getAttribute('data-id'); }));
        break;
      case 'modifica-sicurezza': D.modificaSicurezza(ctxPiano, pr); break;
      case 'modello-piano': D.applicaModello(ctxPiano, pr); break;
      case 'nuova-fase-piano': D.modificaFase(ctxPiano, pr, null); break;
      case 'modifica-fase-piano': D.modificaFase(ctxPiano, pr, P.fasePianificata(pr, b.getAttribute('data-id'))); break;
      case 'avvia-fase-piano': {
        var fp = P.fasePianificata(pr, b.getAttribute('data-id'));
        if (!fp) return;
        U.conferma('Avviare “' + fp.nome + '”?', 'La fase parte da oggi: grafici e telefono useranno le sue conseguenze programmate.', 'Avvia la fase', 'btn-primario')
          .then(function (ok) { if (ok) avviaFase(pr, 'p:' + fp.id, 'Fase del piano'); });
        break;
      }
      case 'elementi': {
        var te = pr.target.find(function (t) { return t.id === b.getAttribute('data-id'); });
        if (te && te.elementi) DR.gestisciElementi(ctxPiano, s, pr, te);
        break;
      }
      case 'elemento-acquisito': {
        var ta = pr.target.find(function (t) { return t.id === b.getAttribute('data-target'); });
        if (ta) DR.segnaAcquisito(ctxPiano, pr, ta, b.getAttribute('data-id'));
        break;
      }
      case 'repertorio-aggiungi': DR.aggiungiRepertorio(ctxPiano, s); break;
      case 'repertorio-togli': DR.togliRepertorio(ctxPiano, s, b.getAttribute('data-id')); break;
      case 'protocollo-modifica': DR.modificaVoce(ctxPiano, stato, b.getAttribute('data-manuale'), b.getAttribute('data-codice')); break;
      case 'protocollo-nuovo-manuale': DR.nuovoManuale(ctxPiano, stato); break;
      case 'protocollo-voci': DR.aggiungiVoci(ctxPiano, stato, b.getAttribute('data-manuale')); break;
      case 'protocollo-obiettivo':
        DR.creaObiettivo(ctxPiano, s, stato, b.getAttribute('data-manuale'), b.getAttribute('data-codice'), function () {
          vista.scheda = 'programmi';
          U.preferenza('desktop-scheda', vista.scheda);
          disegna();
        });
        break;
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
        DS.targetTolto(s, b.getAttribute('data-id'));
        salva();
        break;
      case 'aggiungi-voce': {
        var sel = document.getElementById('sc-aggiungi');
        if (sel && sel.value) { s.schedule.voci.push({ targetId: sel.value }); DS.targetAggiunto(s, sel.value); salva(); }
        break;
      }
      case 'contesto-grafico':
        vista.contesti[b.getAttribute('data-id')] = b.getAttribute('data-contesto');
        disegna();
        break;
      case 'apri-sessione':
        vista.sessioneAperta = vista.sessioneAperta === b.getAttribute('data-id') ? null : b.getAttribute('data-id');
        disegna();
        break;
      case 'cloud': BR.pannelloCloud.apri(); break;
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
    if (DR.cambio(e)) { disegna(); return; }
    if (DS.cambio(ctxPiano, corrente(), e)) return;
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

  BR.cloud.suCambio(function () { disegnaStatoSync(); });

  G.attivaSuggerimenti(document.getElementById('principale'));
  disegna();
  return BR.cloud.avvia();
}).catch(function (e) {
  if (window.console) console.error(e);
  document.body.insertAdjacentHTML('afterbegin', '<p class="avviso" role="alert">L’app non è riuscita a partire: ' + BR.ui.esc(e && e.message || String(e)) + '. Ricarica la pagina.</p>');
});
