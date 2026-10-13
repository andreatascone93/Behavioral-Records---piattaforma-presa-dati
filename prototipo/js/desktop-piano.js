/*
 * Prototipo desktop, scheda "Piano di intervento": per ogni programma le fasi
 * pianificate con gli interventi sull'antecedente e le conseguenze
 * programmate per ogni target. Vedi js/piano.js e docs/piano-intervento.md.
 */
(function (root) {
  'use strict';

  var M = root.BR.modello, P = root.BR.piano, U = root.BR.ui;
  var esc = U.esc;

  function copia(x) { return JSON.parse(JSON.stringify(x)); }

  function mappaTarget(pr) {
    var m = {};
    pr.target.forEach(function (t) { m[t.id] = t; });
    return m;
  }

  function opzioni(mappa, scelto, vuota) {
    return (vuota != null ? '<option value="">' + esc(vuota) + '</option>' : '') +
      Object.keys(mappa).map(function (k) {
        var nome = typeof mappa[k] === 'string' ? mappa[k] : mappa[k].nome;
        return '<option value="' + k + '"' + (k === scelto ? ' selected' : '') + '>' + esc(nome) + '</option>';
      }).join('');
  }

  // Stato di una fase pianificata rispetto alle fasi già svolte.
  function statoFase(pr, f) {
    var storia = pr.fasi || [];
    var ultima = storia[storia.length - 1];
    if (ultima && ultima.pianoId === f.id) return { tipo: 'corrente', voce: ultima };
    var voce = storia.find(function (v) { return v.pianoId === f.id; });
    return voce ? { tipo: 'svolta', voce: voce } : { tipo: 'prevista' };
  }

  // ---- Vista -----------------------------------------------------------------

  function vista(s) {
    if (!s.programmi.length) {
      return '<div class="vuoto"><h3>Nessun programma per questo paziente.</h3><p class="tenue">Crea un programma nella scheda Programmi e target.</p></div>';
    }
    return '<p class="tenue intro">Per ogni programma, le fasi previste. In ogni fase: cosa si fa prima (antecedenti) e cosa succede dopo ogni target (conseguenze programmate). Il telefono mostra in seduta le conseguenze della fase in corso.</p>' +
      s.programmi.map(programma).join('');
  }

  function programma(pr) {
    var tm = mappaTarget(pr);
    var fasi = pr.piano && pr.piano.fasi ? pr.piano.fasi : [];
    var prossima = P.prossimaFase(pr);
    var avvisi = P.controlla(pr);
    return '<section class="carta piano">' +
      '<div class="programma-testa">' +
        '<div><span class="etichetta">' + (pr.area === 'ridurre' ? 'Comportamento da ridurre' : 'Abilità da insegnare') + '</span>' +
        '<h2>' + esc(pr.nome) + '</h2></div>' +
        '<div class="programma-azioni">' +
          '<button class="btn" type="button" data-azione="modello-piano" data-programma="' + pr.id + '">Parti da un modello</button>' +
          '<button class="btn" type="button" data-azione="nuova-fase-piano" data-programma="' + pr.id + '">+ Aggiungi fase</button>' +
        '</div>' +
      '</div>' +
      sintesiTarget(pr, tm) +
      (avvisi.length ? '<ul class="avvisi">' + avvisi.map(function (a) {
        return '<li class="avviso-' + a.livello + '">' + esc(a.testo) + '</li>';
      }).join('') + '</ul>' : '') +
      sicurezza(pr) +
      (fasi.length
        ? '<ol class="piano-fasi">' + fasi.map(function (f, i) { return fase(pr, f, i, tm, prossima); }).join('') + '</ol>'
        : '<div class="vuoto"><h3>Nessuna fase pianificata.</h3><p class="tenue">Parti da un modello (FCT, DRA con schemi concorrenti, DRO, insegnamento di un’abilità) o aggiungi le fasi una alla volta.</p></div>') +
    '</section>';
  }

  // Piano di crisi, consenso e assenso del programma.
  function sicurezza(pr) {
    var x = P.sicurezzaDi(pr);
    var righe = [];
    if (x.consenso.data) {
      righe.push('<li><span class="etichetta">Consenso</span><span>Firmato il ' + esc(U.data(new Date(x.consenso.data + 'T12:00:00').getTime())) +
        (x.consenso.da ? ' da ' + esc((P.CONSENSO_DA[x.consenso.da] || x.consenso.da).toLowerCase()) : '') +
        (x.consenso.restrittive ? ', comprese le procedure restrittive' : '') + (x.consenso.note ? '. ' + esc(x.consenso.note) : '') + '</span></li>');
    }
    if (x.assenso.segni || x.assenso.dissenso) {
      righe.push('<li><span class="etichetta">Assenso</span><span>' + (x.assenso.segni ? 'Assenso: ' + esc(x.assenso.segni) + '. ' : '') +
        (x.assenso.dissenso ? 'Dissenso: ' + esc(x.assenso.dissenso) + '. ' : '') + (x.assenso.cosaFare ? 'Allora: ' + esc(x.assenso.cosaFare) : '') + '</span></li>');
    }
    if (x.crisi.passi) {
      righe.push('<li><span class="etichetta">Crisi</span><span>' + (x.crisi.segnali ? 'Quando: ' + esc(x.crisi.segnali) + '. ' : '') +
        'Cosa fare: ' + esc(x.crisi.passi.replace(/\.\s*$/, '')) + (x.crisi.fine ? '. Finisce quando: ' + esc(x.crisi.fine) : '') +
        (x.crisi.contatti ? '. Avvisare: ' + esc(x.crisi.contatti) : '') + '</span></li>');
    }
    return '<div class="sicurezza">' +
      '<div class="sicurezza-testa"><h3>Sicurezza e consenso</h3>' +
        '<button class="btn btn-piatto piccolo" type="button" data-azione="modifica-sicurezza" data-programma="' + pr.id + '">Modifica</button></div>' +
      (righe.length ? '<ul class="sintesi-target">' + righe.join('') + '</ul>' : '<p class="tenue piccolo">Nessun dato: aggiungi consenso, assenso e, per i comportamenti da ridurre, il piano di crisi.</p>') +
      (x.revisione ? '<p class="tenue piccolo">Revisione prevista: ' + esc(U.data(new Date(x.revisione + 'T12:00:00').getTime())) + '</p>' : '') +
    '</div>';
  }

  function modificaSicurezza(ctx, pr) {
    var x = P.sicurezzaDi(pr);
    function area(id, etichetta, v, segnaposto) {
      return '<div class="campo"><label for="' + id + '">' + esc(etichetta) + '</label><textarea id="' + id + '" placeholder="' + esc(segnaposto || '') + '">' + esc(v || '') + '</textarea></div>';
    }
    function testo(id, etichetta, v, segnaposto) {
      return '<div class="campo largo"><label for="' + id + '">' + esc(etichetta) + '</label><input id="' + id + '" type="text" value="' + esc(v || '') + '" placeholder="' + esc(segnaposto || '') + '"></div>';
    }
    var restr = P.usaRestrittive(pr);
    var html = '<div class="modulo">' +
      '<fieldset><legend>Consenso informato</legend><div class="campi-riga">' +
        '<div class="campo"><label for="sc-data">Data della firma</label><input id="sc-data" type="date" value="' + esc(x.consenso.data) + '"></div>' +
        '<div class="campo"><label for="sc-da">Firmato da</label><select id="sc-da">' + opzioni(P.CONSENSO_DA, x.consenso.da, '—') + '</select></div>' +
        '<div class="campo"><label for="sc-revisione">Revisione prevista</label><input id="sc-revisione" type="date" value="' + esc(x.revisione) + '"></div>' +
      '</div>' +
      '<label class="spunta"><input id="sc-restrittive" type="checkbox"' + (x.consenso.restrittive ? ' checked' : '') + '> Il consenso comprende le procedure restrittive del piano' + (restr ? ' <strong>(il piano ne usa)</strong>' : '') + '</label>' +
      testo('sc-note', 'Note sul consenso', x.consenso.note, 'Es. spiegato con il genitore il 12/10, copia in cartella') +
      '</fieldset>' +
      '<fieldset><legend>Assenso del paziente</legend>' +
        testo('sa-segni', 'Come mostra assenso', x.assenso.segni, 'Es. si avvicina al tavolo, prende il materiale') +
        testo('sa-dissenso', 'Come mostra dissenso', x.assenso.dissenso, 'Es. si allontana, spinge via il materiale, piange') +
        testo('sa-cosa', 'Cosa fa l’operatore quando ritira l’assenso', x.assenso.cosaFare, 'Es. pausa e scelta di un’attività, si riprova dopo 2 minuti') +
      '</fieldset>' +
      '<fieldset><legend>Piano di crisi</legend>' +
        '<p class="aiuto piccolo">Per i comportamenti pericolosi o che non si possono lasciare in estinzione. Il telefono lo mostra sotto i target da ridurre.</p>' +
        testo('cr-segnali', 'Quando si attiva', x.crisi.segnali, 'Es. colpi ripetuti alla testa o rischio per altri') +
        area('cr-passi', 'Cosa fare, nell’ordine', x.crisi.passi, 'Es. allontanare gli altri bambini, togliere oggetti pericolosi, restare a distanza…') +
        testo('cr-fine', 'Quando la crisi è finita', x.crisi.fine, 'Es. 2 minuti senza colpi, respiro calmo') +
        testo('cr-contatti', 'Chi avvisare', x.crisi.contatti, 'Es. supervisore e genitore, nella stessa giornata') +
      '</fieldset>' +
    '</div>';
    U.finestra('Sicurezza e consenso · ' + pr.nome, html, [
      { testo: 'Annulla', valore: null },
      { testo: 'Salva', classe: 'btn-primario', valore: true, invio: true }
    ], { larga: true }).then(function (r) {
      if (!r) return;
      var f = r.form;
      function v(id) { return f.querySelector('#' + id).value.trim(); }
      pr.sicurezza = {
        consenso: { data: v('sc-data'), da: v('sc-da'), restrittive: f.querySelector('#sc-restrittive').checked, note: v('sc-note') },
        assenso: { segni: v('sa-segni'), dissenso: v('sa-dissenso'), cosaFare: v('sa-cosa') },
        crisi: { segnali: v('cr-segnali'), passi: v('cr-passi'), fine: v('cr-fine'), contatti: v('cr-contatti') },
        revisione: v('sc-revisione')
      };
      ctx.salva();
      U.toast('Sicurezza e consenso salvati');
    });
  }

  // Una riga per target: ruolo, funzione e sostituzione, oppure come si insegna.
  function sintesiTarget(pr, tm) {
    var righe = pr.target.map(function (t) {
      var ruolo = P.RUOLI[t.ruolo] || P.RUOLI.abilita;
      var info = '';
      if (t.ruolo === 'problema') {
        var f = t.funzione || {};
        info = 'Funzione: ' + P.descriviFunzione(t).toLowerCase() +
          (f.certezza ? ' (' + P.CERTEZZA[f.certezza].toLowerCase() + ')' : '');
        var sost = pr.target.filter(function (x) { return x.sostituisce === t.id; });
        if (sost.length) info += ' · sostituito da ' + sost.map(function (x) { return '“' + x.nome + '”'; }).join(', ');
      } else if (t.ruolo === 'valutazione') {
        info = 'Serve a formulare l’ipotesi di funzione, non riceve conseguenze programmate';
      } else if (t.insegnamento) {
        var ins = t.insegnamento;
        info = (P.FORMATI[ins.formato] || '') + (ins.prompt && ins.prompt.strategia ? ' · ' + P.STRATEGIE_PROMPT[ins.prompt.strategia].toLowerCase() : '') +
          (ins.prompt && ins.prompt.ritardoSec ? ' (' + ins.prompt.ritardoSec + ' s)' : '');
        if (t.sostituisce && tm[t.sostituisce]) info += ' · sostituisce “' + tm[t.sostituisce].nome + '”';
      }
      var ob = P.obiettivo(t, t.metodo.criterio ? M.descriviCriterio(t.metodo.criterio, t.metodo.tipo) : '');
      return '<li><span class="pillola senza-punto ruolo-' + (t.ruolo || 'abilita') + '">' + esc(ruolo.breve) + '</span>' +
        '<div><strong>' + esc(t.nome) + '</strong>' + (info ? '<span class="tenue piccolo"> · ' + esc(info) + '</span>' : '') +
        (ob ? '<div class="piccolo obiettivo">Obiettivo: ' + esc(ob) + '</div>' : '') + '</div></li>';
    }).join('');
    return righe ? '<ul class="sintesi-target">' + righe + '</ul>' : '';
  }

  function fase(pr, f, i, tm, prossima) {
    var st = statoFase(pr, f);
    var etichettaStato = st.tipo === 'corrente' ? '<span class="pillola penna">In corso dal ' + U.data(new Date(st.voce.inizio + 'T12:00:00').getTime()) + '</span>'
      : st.tipo === 'svolta' ? '<span class="pillola">Svolta dal ' + U.data(new Date(st.voce.inizio + 'T12:00:00').getTime()) + '</span>'
      : '<span class="pillola senza-punto">Prevista</span>';
    var contingenze = f.contingenze || [];
    var antecedenti = f.antecedenti || [];
    return '<li class="fase-piano ' + st.tipo + '">' +
      '<div class="fase-piano-testa">' +
        '<span class="fase-n dato">' + (i + 1) + '</span>' +
        '<div class="fase-piano-titolo"><h3>' + esc(f.nome || P.FASI[f.tipo]) + '</h3>' +
          '<span class="tenue piccolo">' + esc(P.FASI[f.tipo] || f.tipo) + '</span></div>' +
        '<div class="fase-piano-azioni">' + etichettaStato +
          (P.schemiConcorrenti(f) ? '<span class="pillola attenzione senza-punto" title="L’alternativa e il comportamento problema sono entrambi rinforzati, con parametri diversi">Schemi concorrenti</span>' : '') +
          (prossima && prossima.id === f.id ? '<button class="btn btn-primario" type="button" data-azione="avvia-fase-piano" data-programma="' + pr.id + '" data-id="' + f.id + '">Avvia questa fase</button>' : '') +
          '<button class="btn btn-piatto" type="button" data-azione="modifica-fase-piano" data-programma="' + pr.id + '" data-id="' + f.id + '">Modifica</button>' +
        '</div>' +
      '</div>' +
      (f.descrizione ? '<p class="fase-descrizione">' + esc(f.descrizione) + '</p>' : '') +
      '<div class="fase-colonne">' +
        '<div><span class="etichetta">Antecedenti</span>' +
          (antecedenti.length ? '<ul class="lista-piano">' + antecedenti.map(function (a) { return '<li>' + esc(P.descriviAntecedente(a)) + '</li>'; }).join('') + '</ul>'
            : '<p class="tenue piccolo">Nessuno</p>') + '</div>' +
        '<div><span class="etichetta">Conseguenze programmate</span>' +
          (contingenze.length ? '<ul class="lista-piano">' + contingenze.map(function (c) {
            var t = tm[c.targetId];
            var restr = P.PROCEDURE[c.procedura] && P.PROCEDURE[c.procedura].restrittiva;
            return '<li><span class="pillola senza-punto' + (restr ? ' critico' : ' penna') + '">' + esc(P.siglaContingenza(c)) + '</span> ' +
              '<strong>' + esc(t ? t.nome : 'Target da scegliere') + '</strong>' +
              '<div class="tenue piccolo">' + esc(P.descriviContingenza(c, tm)) + '</div>' +
              (restr && c.motivazione ? '<div class="piccolo">Motivazione: ' + esc(c.motivazione) + '</div>' : '') + '</li>';
          }).join('') + '</ul>'
            : '<p class="tenue piccolo">' + (f.tipo === 'baseline' ? 'Conseguenze abituali, nessuna procedura nuova.' : 'Nessuna') + '</p>') + '</div>' +
      '</div>' +
      regoleFase(f, tm) +
    '</li>';
  }

  // Criteri della fase, regola di ritorno e regola di stallo.
  function regoleFase(f, tm) {
    var righe = [];
    if (f.uscita) righe.push('<strong>Per passare alla fase successiva:</strong> ' + esc(f.uscita));
    Object.keys(f.criteri || {}).forEach(function (id) {
      var t = tm[id];
      if (t && f.criteri[id]) righe.push('<strong>Criterio in questa fase per “' + esc(t.nome) + '”:</strong> ' + esc(M.descriviCriterio(f.criteri[id], t.metodo.tipo)));
    });
    if (f.ritorno && f.ritorno.targetId) righe.push('<strong>Ritorno:</strong> ' + esc(P.descriviRitorno(f.ritorno, tm)));
    if (f.stalloSessioni) righe.push('<strong>Nessun progresso:</strong> dopo ' + f.stalloSessioni + ' sessioni senza criteri raggiunti si rivede il programma');
    return righe.length ? '<div class="piccolo uscita">' + righe.map(function (x) { return '<p>' + x + '</p>'; }).join('') + '</div>' : '';
  }

  // ---- Campi dei moduli -------------------------------------------------------

  var ETICHETTE = {
    intervalloSec: 'Intervallo (s)', pausaSec: 'Durata della pausa (s)', tokenPerScambio: 'Token per lo scambio',
    minimo: 'Risposte minime', limite: 'Risposte massime', durataSec: 'Durata (s)', perdita: 'Cosa si perde',
    richieste: 'Richieste facili prima di quella difficile'
  };

  // Ogni input porta il percorso del valore nella bozza (data-k) e l'indice
  // della riga (data-r); i valori numerici hanno data-num.
  function inputNum(r, k, v, etichetta, min) {
    return '<div class="campo"><label>' + esc(etichetta) + '</label><input type="number" step="any" min="' + (min || 0) + '" data-r="' + r + '" data-k="' + k + '" data-num value="' + (v != null ? v : '') + '"></div>';
  }
  function inputTesto(r, k, v, etichetta, segnaposto) {
    return '<div class="campo"><label>' + esc(etichetta) + '</label><input type="text" data-r="' + r + '" data-k="' + k + '" value="' + esc(v || '') + '"' + (segnaposto ? ' placeholder="' + esc(segnaposto) + '"' : '') + '></div>';
  }
  function select(r, k, mappa, v, etichetta, struttura, vuota) {
    return '<div class="campo"><label>' + esc(etichetta) + '</label><select data-r="' + r + '" data-k="' + k + '"' + (struttura ? ' data-struttura' : '') + '>' + opzioni(mappa, v, vuota) + '</select></div>';
  }

  function campiSchema(r, base, schema, soloTempo, segnalabile) {
    var s = schema || {};
    var tipi = {};
    Object.keys(P.SCHEMI).forEach(function (k) {
      var tempo = k === 'FT' || k === 'VT';
      if (k === 'EXT') return;
      if (soloTempo ? tempo : !tempo) tipi[k] = P.SCHEMI[k].nome.indexOf('(') !== -1 ? P.SCHEMI[k].nome : P.SCHEMI[k].nome + ' (' + P.SCHEMI[k].sigla + ')';
    });
    var def = P.SCHEMI[s.tipo];
    var html = '<div class="campi-riga">' + select(r, base + '.tipo', tipi, s.tipo, 'Schema di rinforzo', true) +
      (def && def.valore ? inputNum(r, base + '.valore', s.valore, 'Valore (' + def.valore + ')', 1) : '') + '</div>';
    if (segnalabile) {
      html += '<label class="spunta piccolo"><input type="checkbox" data-r="' + r + '" data-k="' + base + '.segnalato" data-interruttore' + (s.segnalato ? ' checked' : '') + '> Schema multiplo segnalato (periodi con rinforzo e senza, con stimoli diversi)</label>';
      if (s.segnalato) {
        html += '<div class="campi-riga">' + inputNum(r, base + '.segnalato.sdSec', s.segnalato.sdSec, 'Con rinforzo (s)', 1) +
          inputTesto(r, base + '.segnalato.stimoloSd', s.segnalato.stimoloSd, 'Stimolo (SD)') +
          inputNum(r, base + '.segnalato.sdeltaSec', s.segnalato.sdeltaSec, 'Senza rinforzo (s)', 1) +
          inputTesto(r, base + '.segnalato.stimoloSdelta', s.segnalato.stimoloSdelta, 'Stimolo (SΔ)') + '</div>';
      }
    }
    return html;
  }

  function campiRinforzatore(r, base, rf, titolo) {
    var x = rf || {};
    return '<div class="sottogruppo"><span class="etichetta">' + esc(titolo || 'Rinforzatore') + '</span>' +
      '<div class="campi-riga">' + inputTesto(r, base + '.descrizione', x.descrizione, 'Cosa', 'Es. 30 s di tablet').replace('<input ', '<input list="fp-preferiti" ') +
      select(r, base + '.categoria', P.CATEGORIE_RINFORZATORE, x.categoria, 'Tipo') + '</div>' +
      '<div class="campi-riga">' + inputTesto(r, base + '.magnitudo', x.magnitudo, 'Quantità o durata') +
      select(r, base + '.qualita', P.QUALITA, x.qualita, 'Qualità') +
      inputNum(r, base + '.ritardoSec', x.ritardoSec, 'Ritardo (s)') + '</div></div>';
  }

  // Suggerimenti dalla valutazione delle preferenze più recente.
  function preferiti(sugg) {
    if (!sugg.stimoli.length) return '<p class="aiuto piccolo">Nessuna valutazione delle preferenze: aggiungine una nella scheda Preferenze per avere i rinforzatori suggeriti.</p>';
    var alti = sugg.stimoli.filter(function (x) { return x.livello === 'alta'; });
    return '<datalist id="fp-preferiti">' + sugg.stimoli.map(function (x) { return '<option value="' + esc(x.nome) + '">'; }).join('') + '</datalist>' +
      '<p class="aiuto piccolo preferiti">Preferenze del ' + esc(U.data(new Date(sugg.valutazione.data + 'T12:00:00').getTime())) + ': ' +
      (alti.length ? 'alta preferenza per ' + alti.map(function (x) { return '<strong>' + esc(x.nome) + '</strong>'; }).join(', ') : 'nessuno stimolo ad alta preferenza') +
      '. I campi “Cosa” li propongono mentre scrivi.' +
      (sugg.scaduta ? ' <span class="pillola attenzione">Valutazione di ' + sugg.giorni + ' giorni fa: da rifare</span>' : '') + '</p>';
  }

  function campiContingenza(c, r, pr) {
    var proc = P.PROCEDURE[c.procedura];
    var t = pr.target.find(function (x) { return x.id === c.targetId; });
    var ruolo = t ? t.ruolo || 'abilita' : null;
    var target = {};
    pr.target.forEach(function (x) { if (x.ruolo !== 'valutazione') target[x.id] = x.nome + ' (' + (P.RUOLI[x.ruolo] || P.RUOLI.abilita).breve.toLowerCase() + ')'; });
    var procedure = {};
    Object.keys(P.PROCEDURE).forEach(function (k) {
      if (!ruolo || P.PROCEDURE[k].ruoli.indexOf(ruolo) !== -1) procedure[k] = P.PROCEDURE[k].nome;
    });
    var html = '<div class="riga-piano">' +
      '<div class="riga-piano-testa"><span class="etichetta">Conseguenza ' + (r + 1) + '</span>' +
      '<button class="btn btn-piatto btn-pericolo piccolo" type="button" data-togli="contingenze" data-r="' + r + '">Togli</button></div>' +
      '<div class="campi-riga">' + select(r, 'targetId', target, c.targetId, 'Target', true, 'Scegli…') +
      (ruolo ? select(r, 'procedura', procedure, c.procedura, 'Procedura', true, 'Scegli…') : '') + '</div>';
    if (!proc) return html + '</div>';
    var p = c.parametri || {};
    var alternative = {};
    pr.target.forEach(function (x) { if (x.id !== c.targetId && (x.ruolo === 'sostitutivo' || x.ruolo === 'abilita')) alternative[x.id] = x.nome; });
    proc.campi.forEach(function (campo) {
      switch (campo) {
        case 'schema': html += campiSchema(r, 'schema', c.schema, false, /^(fct|dra)$/.test(c.procedura)); break;
        case 'rinforzatore': html += campiRinforzatore(r, 'rinforzatore', c.rinforzatore, /^(fct|dra|dri)$/.test(c.procedura) ? 'Rinforzatore per l’alternativa' : 'Rinforzatore'); break;
        case 'alternativoId': html += select(r, 'parametri.alternativoId', alternative, p.alternativoId, 'Comportamento alternativo da rinforzare', false, 'Scegli…'); break;
        case 'problema':
          html += select(r, 'parametri.problema', P.VARIANTI.problema, p.problema || 'estinzione', 'Il comportamento problema', true);
          if (p.problema === 'rinforzo') {
            html += '<p class="aiuto piccolo">Schemi concorrenti: rendi l’alternativa più vantaggiosa (qualità più alta, quantità maggiore o ritardo minore).</p>' +
              campiSchema(r, 'parametri.schemaProblema', p.schemaProblema, false, false) +
              campiRinforzatore(r, 'parametri.rinforzatoreProblema', p.rinforzatoreProblema, 'Rinforzatore che il problema ottiene ancora');
          }
          break;
        case 'varianteDro': case 'varianteDrl': case 'varianteEstinzione': case 'varianteTimeout':
          html += select(r, 'parametri.variante', P.VARIANTI[campo], p.variante, 'Variante', true); break;
        case 'azzera':
          html += '<label class="spunta piccolo"><input type="checkbox" data-r="' + r + '" data-k="parametri.azzera"' + (p.azzera ? ' checked' : '') + '> Il comportamento fa ripartire l’intervallo</label>'; break;
        case 'perdita': html += inputTesto(r, 'parametri.perdita', p.perdita, ETICHETTE.perdita, 'Es. 1 token'); break;
        case 'prezzi':
          html += '<div class="campo"><label>Menu dei rinforzatori di scambio, uno per riga: nome = token</label>' +
            '<textarea data-r="' + r + '" data-k="parametri.prezzi" data-prezzi placeholder="Es. Due minuti di tablet = 5">' + esc(P.scriviPrezzi(p.prezzi)) + '</textarea>' +
            '<span class="aiuto">Lo schema sopra dice quando si guadagna un token; “token per lo scambio” quando si può scambiare; il menu quanto costa ogni rinforzatore.</span></div>';
          break;
        case 'intervalloSec':
          if (c.procedura === 'drl' && p.variante === 'sessione') break;
          html += inputNum(r, 'parametri.intervalloSec', p.intervalloSec, c.procedura === 'drl' && p.variante === 'distanziate' ? 'IRT minimo (s)' : ETICHETTE.intervalloSec, 1); break;
        case 'limite':
          if (c.procedura === 'drl' && p.variante === 'distanziate') break;
          html += inputNum(r, 'parametri.limite', p.limite, ETICHETTE.limite); break;
        default:
          html += inputNum(r, 'parametri.' + campo, p[campo], ETICHETTE[campo] || campo);
      }
    });
    if (proc.restrittiva) {
      html += '<div class="campo"><label>Motivazione e alternative meno restrittive già provate</label><textarea data-r="' + r + '" data-k="motivazione">' + esc(c.motivazione || '') + '</textarea>' +
        '<span class="aiuto">Procedura restrittiva: va motivata con i dati e preceduta da procedure basate sul rinforzo.</span></div>';
    }
    return html + '</div>';
  }

  function campiAntecedente(a, r) {
    var html = '<div class="riga-piano">' +
      '<div class="riga-piano-testa"><span class="etichetta">Antecedente ' + (r + 1) + '</span>' +
      '<button class="btn btn-piatto btn-pericolo piccolo" type="button" data-togli="antecedenti" data-r="' + r + '">Togli</button></div>' +
      select(r, 'tipo', P.ANTECEDENTI, a.tipo, 'Intervento', true);
    if (a.tipo === 'ncr') html += campiSchema(r, 'schema', a.schema, true, false) + campiRinforzatore(r, 'rinforzatore', a.rinforzatore);
    if (a.tipo === 'alta_probabilita') html += inputNum(r, 'richieste', a.richieste, ETICHETTE.richieste, 1);
    html += '<div class="campo"><label>Come si applica</label><input type="text" data-r="' + r + '" data-k="dettaglio" value="' + esc(a.dettaglio || '') + '"></div>';
    return html + '</div>';
  }

  // ---- Valori predefiniti ----------------------------------------------------

  function variantePredefinita(campo, t) {
    var funzioni = P.funzioniDi(t);
    if (campo === 'varianteEstinzione' && funzioni.length && P.FUNZIONI[funzioni[0]].estinzione) {
      return P.FUNZIONI[funzioni[0]].estinzione;
    }
    return Object.keys(P.VARIANTI[campo])[0];
  }

  function nuovaContingenza(c, pr) {
    var t = pr.target.find(function (x) { return x.id === c.targetId; });
    var proc = P.PROCEDURE[c.procedura];
    var out = { id: c.id, targetId: c.targetId, procedura: c.procedura, parametri: {} };
    if (!proc) return out;
    proc.campi.forEach(function (campo) {
      if (campo === 'schema') out.schema = { tipo: 'CRF' };
      if (campo === 'rinforzatore') out.rinforzatore = { descrizione: '', categoria: 'sociale', qualita: 'alta', ritardoSec: 0 };
      if (campo === 'problema') out.parametri.problema = 'estinzione';
      if (campo === 'alternativoId') {
        var sost = pr.target.find(function (x) { return x.sostituisce === c.targetId; });
        if (sost) out.parametri.alternativoId = sost.id;
      }
      if (/^variante/.test(campo)) out.parametri.variante = variantePredefinita(campo, t);
      if (campo === 'intervalloSec') out.parametri.intervalloSec = 60;
      if (campo === 'tokenPerScambio') out.parametri.tokenPerScambio = 5;
      if (campo === 'prezzi') out.parametri.prezzi = [];
      if (campo === 'azzera') out.parametri.azzera = true;
    });
    // Per FCT il rinforzatore di partenza è quello della funzione.
    // Con funzioni sintetizzate il rinforzatore le combina tutte.
    if (c.procedura === 'fct' && P.funzioniDi(t).length) {
      var f = t.funzione.sintetizzata ? P.funzioniDi(t) : P.funzioniDi(t)[0];
      out.rinforzatore = P.rinforzatoreFunzionale(f);
    }
    return out;
  }

  function imposta(oggetto, percorso, valore) {
    var parti = percorso.split('.');
    var o = oggetto;
    for (var i = 0; i < parti.length - 1; i++) {
      if (o[parti[i]] == null || typeof o[parti[i]] !== 'object') o[parti[i]] = {};
      o = o[parti[i]];
    }
    o[parti[parti.length - 1]] = valore;
  }

  // ---- Finestre ----------------------------------------------------------------

  function campiCriteriFase(pr, bozza) {
    var criteri = bozza.criteri || {};
    return pr.target.filter(function (t) { return t.ruolo !== 'valutazione'; }).map(function (t) {
      var c = criteri[t.id];
      var unita = M.TIPI[t.metodo.tipo].unita;
      return '<div class="riga-criterio" data-criterio="' + t.id + '">' +
        '<label class="spunta piccolo"><input type="checkbox" data-c-usa' + (c ? ' checked' : '') + '> Criterio proprio per “' + esc(t.nome) + '”</label>' +
        '<div class="campi-riga">' +
          '<div class="campo"><label>Valore</label><select data-c-verso><option value="almeno"' + (c && c.verso === 'almeno' ? ' selected' : '') + '>almeno</option><option value="al_massimo"' + ((c ? c.verso === 'al_massimo' : t.direzione === 'ridurre') ? ' selected' : '') + '>al massimo</option></select></div>' +
          '<div class="campo"><label>Soglia (' + esc(unita) + ')</label><input data-c-soglia type="number" step="any" min="0" value="' + (c ? c.soglia : (t.metodo.criterio ? t.metodo.criterio.soglia : '')) + '"></div>' +
          '<div class="campo"><label>Sessioni</label><input data-c-sessioni type="number" min="1" max="10" value="' + (c ? c.sessioni : 2) + '"></div>' +
        '</div></div>';
    }).join('');
  }

  function leggiCriteriFase(form) {
    var out = {};
    form.querySelectorAll('[data-criterio]').forEach(function (el) {
      if (!el.querySelector('[data-c-usa]').checked) return;
      out[el.getAttribute('data-criterio')] = {
        verso: el.querySelector('[data-c-verso]').value,
        soglia: +el.querySelector('[data-c-soglia]').value || 0,
        sessioni: +el.querySelector('[data-c-sessioni]').value || 2
      };
    });
    return out;
  }

  function modificaFase(ctx, pr, faseEsistente) {
    var nuova = !faseEsistente;
    var bozza = nuova
      ? { id: M.nuovoId('pf'), tipo: 'intervento', nome: '', descrizione: '', antecedenti: [], contingenze: [], criteri: {}, uscita: '' }
      : copia(faseEsistente);
    var st = nuova ? { tipo: 'prevista' } : statoFase(pr, faseEsistente);
    var sugg = P.suggerimentiRinforzatori(ctx.soggetto ? ctx.soggetto() : null);

    var html = '<div class="modulo">' +
      '<div class="campi-riga">' +
        '<div class="campo largo"><label for="fp-nome">Nome della fase</label><input id="fp-nome" type="text" required value="' + esc(bozza.nome) + '" placeholder="Es. FCT con rinforzo continuo"></div>' +
        '<div class="campo"><label for="fp-tipo">Tipo</label><select id="fp-tipo">' + opzioni(P.FASI, bozza.tipo) + '</select></div>' +
      '</div>' +
      '<div class="campo"><label for="fp-descrizione">Descrizione</label><textarea id="fp-descrizione" placeholder="Cosa cambia in questa fase">' + esc(bozza.descrizione || '') + '</textarea></div>' +
      '<fieldset><legend>Antecedenti</legend><div id="fp-antecedenti"></div>' +
        '<button class="btn btn-piatto" type="button" data-aggiungi="antecedenti">+ Aggiungi intervento sull’antecedente</button></fieldset>' +
      '<fieldset><legend>Conseguenze programmate</legend><p class="aiuto piccolo">Una riga per procedura. Per rinforzo differenziale con estinzione aggiungi anche la riga di estinzione sul comportamento problema.</p>' +
        preferiti(sugg) + '<div id="fp-contingenze"></div>' +
        '<button class="btn btn-piatto" type="button" data-aggiungi="contingenze">+ Aggiungi conseguenza</button></fieldset>' +
      '<div class="campo"><label for="fp-uscita">Criterio per passare alla fase successiva</label><input id="fp-uscita" type="text" value="' + esc(bozza.uscita || '') + '" placeholder="Es. problema sotto 0,2 al minuto per 3 sessioni"></div>' +
      '<fieldset><legend>Regole decisionali</legend>' +
        '<p class="aiuto piccolo">Criteri propri di questa fase (sostituiscono il criterio di padronanza del target finché la fase è in corso), regola di ritorno allo step precedente e regola di stallo.</p>' +
        campiCriteriFase(pr, bozza) +
        '<div class="sottogruppo"><span class="etichetta">Ritorno alla fase precedente</span><div class="campi-riga">' +
          '<div class="campo largo"><label for="fp-r-target">Se il target</label><select id="fp-r-target"><option value="">Nessuna regola</option>' +
            pr.target.filter(function (t) { return t.ruolo !== 'valutazione'; }).map(function (t) {
              return '<option value="' + t.id + '"' + (bozza.ritorno && bozza.ritorno.targetId === t.id ? ' selected' : '') + '>' + esc(t.nome) + '</option>';
            }).join('') + '</select></div>' +
          '<div class="campo"><label for="fp-r-verso">è</label><select id="fp-r-verso"><option value="almeno"' + (bozza.ritorno && bozza.ritorno.verso === 'almeno' ? ' selected' : '') + '>almeno</option><option value="al_massimo"' + (bozza.ritorno && bozza.ritorno.verso === 'al_massimo' ? ' selected' : '') + '>al massimo</option></select></div>' +
          '<div class="campo"><label for="fp-r-soglia">Soglia</label><input id="fp-r-soglia" type="number" step="any" min="0" value="' + (bozza.ritorno ? bozza.ritorno.soglia : '') + '"></div>' +
          '<div class="campo"><label for="fp-r-sessioni">Per sessioni</label><input id="fp-r-sessioni" type="number" min="1" max="10" value="' + (bozza.ritorno ? bozza.ritorno.sessioni : 2) + '"></div>' +
        '</div></div>' +
        '<div class="campo"><label for="fp-stallo">Rivedi il programma dopo quante sessioni senza criteri raggiunti</label><input id="fp-stallo" type="number" min="0" max="60" value="' + (bozza.stalloSessioni || '') + '" placeholder="Es. 10; vuoto per nessuna regola"></div>' +
      '</fieldset>' +
      (st.tipo !== 'prevista' ? '<p class="tenue piccolo">Questa fase è già ' + (st.tipo === 'corrente' ? 'in corso' : 'stata svolta') + ': le modifiche valgono da ora in avanti.</p>' : '') +
    '</div>';

    function disegnaRighe(form) {
      form.querySelector('#fp-antecedenti').innerHTML = bozza.antecedenti.map(campiAntecedente).join('') || '<p class="tenue piccolo">Nessuno.</p>';
      form.querySelector('#fp-contingenze').innerHTML = bozza.contingenze.map(function (c, r) { return campiContingenza(c, r, pr); }).join('') || '<p class="tenue piccolo">Nessuna.</p>';
    }

    function elenco(el) { return el.closest('#fp-antecedenti') ? bozza.antecedenti : bozza.contingenze; }

    var azioni = [{ testo: 'Annulla', valore: null }];
    if (!nuova && st.tipo === 'prevista') azioni.push({ testo: 'Elimina fase', classe: 'btn-pericolo', valore: 'elimina' });
    azioni.push({ testo: nuova ? 'Aggiungi fase' : 'Salva', classe: 'btn-primario', valore: true, invio: true });

    U.finestra(nuova ? 'Nuova fase in “' + pr.nome + '”' : 'Modifica fase', html, azioni, {
      larga: true,
      dopo: function (form) {
        disegnaRighe(form);
        form.addEventListener('input', function (e) {
          var el = e.target;
          if (!el.hasAttribute('data-k') || el.type === 'checkbox' || el.tagName === 'SELECT') return;
          var riga = elenco(el)[+el.getAttribute('data-r')];
          var valore = el.hasAttribute('data-num') ? (el.value === '' ? null : +el.value)
            : el.hasAttribute('data-prezzi') ? P.leggiPrezzi(el.value) : el.value;
          imposta(riga, el.getAttribute('data-k'), valore);
        });
        form.addEventListener('change', function (e) {
          var el = e.target;
          if (!el.hasAttribute('data-k')) return;
          var lista = elenco(el);
          var r = +el.getAttribute('data-r');
          var k = el.getAttribute('data-k');
          if (el.hasAttribute('data-interruttore')) {
            imposta(lista[r], k, el.checked ? { sdSec: 60, sdeltaSec: 30, stimoloSd: 'cartellino verde', stimoloSdelta: 'cartellino rosso' } : null);
          } else if (el.type === 'checkbox') {
            imposta(lista[r], k, el.checked);
          } else if (el.tagName === 'SELECT') {
            imposta(lista[r], k, el.value);
            // Cambiare target o procedura riparte dai valori predefiniti.
            if (lista === bozza.contingenze && (k === 'targetId' || k === 'procedura')) {
              if (k === 'targetId') {
                var t = pr.target.find(function (x) { return x.id === el.value; });
                if (t && P.PROCEDURE[lista[r].procedura] && P.PROCEDURE[lista[r].procedura].ruoli.indexOf(t.ruolo || 'abilita') === -1) lista[r].procedura = '';
              }
              lista[r] = nuovaContingenza(lista[r], pr);
            }
            if (lista === bozza.antecedenti && k === 'tipo') {
              var a = { id: lista[r].id, tipo: el.value, dettaglio: lista[r].dettaglio || '' };
              if (el.value === 'ncr') { a.schema = { tipo: 'FT', valore: 60 }; a.rinforzatore = { descrizione: '', categoria: 'sociale', qualita: 'alta', ritardoSec: 0 }; }
              if (el.value === 'alta_probabilita') a.richieste = 3;
              lista[r] = a;
            }
            if (k.slice(-5) === '.tipo' && P.SCHEMI[el.value] && !P.SCHEMI[el.value].valore) imposta(lista[r], k.replace(/\.tipo$/, '.valore'), null);
          }
          if (el.hasAttribute('data-struttura') || el.hasAttribute('data-interruttore')) disegnaRighe(form);
        });
        form.addEventListener('click', function (e) {
          var b = e.target.closest('[data-aggiungi], [data-togli]');
          if (!b) return;
          e.preventDefault();
          if (b.hasAttribute('data-aggiungi')) {
            if (b.getAttribute('data-aggiungi') === 'antecedenti') bozza.antecedenti.push({ id: M.nuovoId('an'), tipo: 'scelta', dettaglio: '' });
            else bozza.contingenze.push({ id: M.nuovoId('ct'), targetId: '', procedura: '', parametri: {} });
          } else {
            bozza[b.getAttribute('data-togli')].splice(+b.getAttribute('data-r'), 1);
          }
          disegnaRighe(form);
        });
      },
      valida: function (form) {
        var n = form.querySelector('#fp-nome');
        if (!n.value.trim()) { n.focus(); return false; }
        return true;
      }
    }).then(function (r) {
      if (!r) return;
      pr.piano = pr.piano || { modello: null, fasi: [] };
      if (r.valore === 'elimina') {
        pr.piano.fasi = pr.piano.fasi.filter(function (f) { return f.id !== bozza.id; });
        ctx.salva();
        U.toast('Fase eliminata');
        return;
      }
      var f = r.form;
      bozza.nome = f.querySelector('#fp-nome').value.trim();
      bozza.tipo = f.querySelector('#fp-tipo').value;
      bozza.descrizione = f.querySelector('#fp-descrizione').value.trim();
      bozza.uscita = f.querySelector('#fp-uscita').value.trim();
      bozza.criteri = leggiCriteriFase(f);
      var rt = f.querySelector('#fp-r-target').value;
      bozza.ritorno = rt ? { targetId: rt, verso: f.querySelector('#fp-r-verso').value, soglia: +f.querySelector('#fp-r-soglia').value || 0, sessioni: +f.querySelector('#fp-r-sessioni').value || 2 } : null;
      bozza.stalloSessioni = +f.querySelector('#fp-stallo').value || null;
      bozza.contingenze = bozza.contingenze.filter(function (c) { return c.targetId && c.procedura; });
      if (nuova) pr.piano.fasi.push(bozza);
      else pr.piano.fasi[pr.piano.fasi.findIndex(function (x) { return x.id === bozza.id; })] = bozza;
      ctx.salva();
      U.toast(nuova ? 'Fase aggiunta al piano' : 'Fase salvata');
    });
  }

  function applicaModello(ctx, pr) {
    var problemi = pr.target.filter(function (t) { return t.ruolo === 'problema'; });
    var altri = pr.target.filter(function (t) { return t.ruolo === 'sostitutivo' || t.ruolo === 'abilita'; });
    var opz = function (lista) {
      var m = {};
      lista.forEach(function (t) { m[t.id] = t.nome; });
      return m;
    };
    var html = '<div class="modulo">' +
      '<div class="campo"><label for="mp-modello">Modello</label><select id="mp-modello">' + opzioni(P.MODELLI, pr.area === 'ridurre' ? 'fct' : 'acquisizione') + '</select><span class="aiuto" id="mp-aiuto"></span></div>' +
      '<div class="campi-riga">' +
        '<div class="campo"><label for="mp-problema">Comportamento problema</label><select id="mp-problema">' + opzioni(opz(problemi), problemi[0] && problemi[0].id, 'Nessuno') + '</select></div>' +
        '<div class="campo"><label for="mp-alternativo">Comportamento da rinforzare</label><select id="mp-alternativo">' + opzioni(opz(altri), altri[0] && altri[0].id, 'Nessuno') + '</select></div>' +
      '</div>' +
      '<p class="tenue piccolo">Le fasi previste vengono sostituite; quelle già svolte restano. Poi puoi modificare ogni fase.</p></div>';
    U.finestra('Parti da un modello', html, [
      { testo: 'Annulla', valore: null },
      { testo: 'Usa il modello', classe: 'btn-primario', valore: true, invio: true }
    ], {
      larga: true,
      dopo: function (form) {
        var aggiorna = function () { form.querySelector('#mp-aiuto').textContent = P.MODELLI[form.querySelector('#mp-modello').value].descrizione; };
        aggiorna();
        form.querySelector('#mp-modello').addEventListener('change', aggiorna);
      }
    }).then(function (r) {
      if (!r) return;
      var f = r.form;
      var chiave = f.querySelector('#mp-modello').value;
      var trova = function (id) { return pr.target.find(function (t) { return t.id === id; }) || null; };
      var problema = trova(f.querySelector('#mp-problema').value);
      var alternativo = trova(f.querySelector('#mp-alternativo').value);
      var funzioni = P.funzioniDi(problema);
      var funzione = problema && problema.funzione && problema.funzione.sintetizzata ? funzioni : funzioni[0] || null;
      var nuove = P.creaFasi(chiave, problema, alternativo, funzione);
      pr.piano = pr.piano || { modello: null, fasi: [] };
      var svolte = pr.piano.fasi.filter(function (x) { return statoFase(pr, x).tipo !== 'prevista'; });
      // Se una fase del modello è dello stesso tipo di una già svolta all'inizio
      // (di solito la baseline), si tiene quella svolta.
      if (svolte.length && nuove.length && nuove[0].tipo === svolte[0].tipo) nuove.shift();
      pr.piano.modello = chiave;
      pr.piano.fasi = svolte.concat(nuove);
      ctx.salva();
      U.toast('Piano creato dal modello “' + P.MODELLI[chiave].nome + '”');
    });
  }

  root.BR.desktopPiano = {
    vista: vista, modificaFase: modificaFase, modificaSicurezza: modificaSicurezza, applicaModello: applicaModello, statoFase: statoFase
  };
})(window);
