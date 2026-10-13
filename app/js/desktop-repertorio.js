/*
 * Prototipo desktop: elementi dei target (es. 25 tact da insegnare), scheda
 * "Repertorio" del paziente e scheda "Protocolli" con la libreria dei
 * manuali (VB-MAPP e manuali aggiunti) da cui creare gli obiettivi.
 */
(function (root) {
  'use strict';

  var M = root.BR.modello, P = root.BR.piano, U = root.BR.ui, R = root.BR.repertorio, PR = root.BR.protocolli, A = root.BR.archivio;
  var esc = U.esc;

  function opzioni(mappa, scelto, nome) {
    return Object.keys(mappa).map(function (k) {
      var n = nome ? nome(mappa[k], k) : (typeof mappa[k] === 'string' ? mappa[k] : mappa[k].nome);
      return '<option value="' + esc(k) + '"' + (String(k) === String(scelto) ? ' selected' : '') + '>' + esc(n) + '</option>';
    }).join('');
  }

  function nomeOperante(op) { return (R.OPERANTI[op] || R.OPERANTI.altro).nome; }
  function data(iso) { return iso ? U.data(new Date(iso + 'T12:00:00').getTime()) : ''; }

  var CONTA = {
    repertorio: 'Tutte le risposte acquisite di quell’operante, anche quelle già presenti',
    target: 'Solo le risposte acquisite in questo target'
  };

  // ---- Modulo del target ---------------------------------------------------------

  function campiTarget(bozza) {
    var el = bozza.elementi && bozza.elementi.attivo !== false ? bozza.elementi : null;
    var e = el || R.nuoviElementi('tact');
    var voci = (bozza.elementi && bozza.elementi.voci) || [];
    var conti = { coda: 0, insegnamento: 0, acquisito: 0 };
    voci.forEach(function (v) { conti[v.stato] = (conti[v.stato] || 0) + 1; });
    return '<fieldset data-tipi="dtt"><legend>Elenco di risposte e obiettivo numerico</legend>' +
      '<label class="spunta"><input id="e-attivo" type="checkbox"' + (el ? ' checked' : '') + '> Il target insegna un elenco di risposte (es. 25 tact, 25 intraverbali di completamento)</label>' +
      '<div id="e-campi">' +
        '<div class="campi-riga">' +
          '<div class="campo"><label for="e-operante">Operante</label><select id="e-operante">' + opzioni(R.OPERANTI, e.operante) + '</select></div>' +
          '<div class="campo"><label for="e-obiettivo">Obiettivo: risposte acquisite</label><input id="e-obiettivo" type="number" min="1" placeholder="Es. 25" value="' + (e.obiettivo || '') + '"></div>' +
          '<div class="campo"><label for="e-insieme">In insegnamento insieme</label><input id="e-insieme" type="number" min="1" max="20" value="' + (e.inContemporanea || 3) + '"></div>' +
        '</div>' +
        '<div class="campo"><label for="e-conta">Per l’obiettivo contano</label><select id="e-conta">' + opzioni(CONTA, e.conta || 'repertorio') + '</select></div>' +
        '<div class="campi-riga">' +
          '<label class="spunta piccolo"><input id="e-alterna" type="checkbox"' + (e.alternanza && e.alternanza.attiva ? ' checked' : '') + '> Alterna richieste facili su risposte già acquisite</label>' +
          '<div class="campo"><label for="e-ogni">Una richiesta facile ogni … prove di training</label><input id="e-ogni" type="number" min="1" max="10" value="' + ((e.alternanza && e.alternanza.ogni) || 1) + '"></div>' +
        '</div>' +
        '<div class="campo"><label for="e-nuove">Aggiungi risposte, una per riga</label><textarea id="e-nuove" rows="4" placeholder="animali: mucca&#10;animali: pecora&#10;cibi: mela&#10;palla"></textarea>' +
          '<span class="aiuto">La categoria va prima dei due punti; le virgole restano nella risposta (utile per i completamenti). Entrano in coda e passano in insegnamento fino al numero indicato.</span></div>' +
        (voci.length ? '<p class="tenue piccolo">Già nell’elenco: ' + voci.length + ' risposte (' + conti.insegnamento + ' in insegnamento, ' + conti.coda + ' in coda, ' + conti.acquisito + ' acquisite). Stato e categorie si cambiano dal pulsante Elementi nella tabella dei target.</p>' : '') +
        '<p class="aiuto piccolo">Ogni risposta in insegnamento ha il suo andamento: quando raggiunge il criterio del target (o il 90% per 3 sessioni) il desktop propone di segnarla acquisita, e la prossima in coda prende il suo posto. Le richieste facili si registrano a parte e non entrano nella percentuale del target.</p>' +
      '</div></fieldset>';
  }

  function attivaCampi(form) {
    var c = form.querySelector('#e-attivo');
    if (!c) return;
    var agg = function () { form.querySelector('#e-campi').hidden = !c.checked; };
    c.addEventListener('change', agg);
    agg();
  }

  // Aggiorna bozza.elementi dal modulo. Togliere la spunta non cancella le
  // risposte: l'elenco resta, spento.
  function leggiTarget(form, bozza) {
    var tipo = form.querySelector('#t-tipo').value;
    var attivo = tipo === 'dtt' && form.querySelector('#e-attivo').checked;
    if (!attivo) {
      if (bozza.elementi) bozza.elementi.attivo = false;
      return;
    }
    var q = function (sel) { return form.querySelector(sel); };
    var el = bozza.elementi || R.nuoviElementi();
    el.attivo = true;
    el.operante = q('#e-operante').value;
    el.obiettivo = +q('#e-obiettivo').value > 0 ? Math.round(+q('#e-obiettivo').value) : null;
    el.conta = q('#e-conta').value;
    el.inContemporanea = Math.max(Math.round(+q('#e-insieme').value || 3), 1);
    el.alternanza = { attiva: q('#e-alterna').checked, ogni: Math.max(Math.round(+q('#e-ogni').value || 1), 1) };
    R.aggiungiVoci(el, R.leggiRighe(q('#e-nuove').value), 'coda');
    R.promuovi(el);
    bozza.elementi = el;
  }

  // ---- Tabella dei target e gestione degli elementi --------------------------------

  function riassuntoTabella(s, pr, t) {
    var el = R.elementi(t);
    if (!el) return '';
    return '<div class="tenue piccolo">' + esc(R.descriviProgresso(R.progresso(s, t))) + '</div>' +
      (t.protocollo ? '<div class="tenue piccolo">' + esc(t.protocollo.nomeManuale || t.protocollo.manuale) + ' · ' + esc(t.protocollo.codice) + '</div>' : '') +
      '<button class="btn btn-piatto piccolo" type="button" data-azione="elementi" data-programma="' + pr.id + '" data-id="' + t.id + '">Elementi</button>';
  }

  function gestisciElementi(ctx, s, pr, t) {
    var el = JSON.parse(JSON.stringify(t.elementi));
    function righe() {
      if (!el.voci.length) return '<p class="tenue">Nessuna risposta ancora: aggiungile qui sotto.</p>';
      return '<div class="tabella-box"><table class="tabella elementi"><thead><tr><th>Risposta</th><th>Categoria</th><th>Stato</th><th>Date</th><th>Togli</th></tr></thead><tbody>' +
        el.voci.map(function (v, i) {
          return '<tr><td><input type="text" data-i="' + i + '" data-k="testo" value="' + esc(v.testo) + '" aria-label="Risposta"></td>' +
            '<td><input type="text" data-i="' + i + '" data-k="categoria" value="' + esc(v.categoria || '') + '" aria-label="Categoria"></td>' +
            '<td><select data-i="' + i + '" data-k="stato" aria-label="Stato">' + opzioni(R.STATI, v.stato) + '</select></td>' +
            '<td class="piccolo tenue">' + (v.inizio ? 'dal ' + esc(data(v.inizio)) : '') + (v.acquisito ? '<br>acquisita il ' + esc(data(v.acquisito)) : '') + '</td>' +
            '<td class="num"><input type="checkbox" data-togli="' + i + '" aria-label="Togli ' + esc(v.testo) + '"></td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    var html = '<div class="modulo">' +
      '<p class="tenue piccolo">' + esc(R.descriviProgresso(R.progresso(s, t))) + '. In insegnamento insieme: ' + el.inContemporanea + '. Le prove già registrate restano anche se togli una risposta.</p>' +
      '<div id="el-righe">' + righe() + '</div>' +
      '<div class="campo"><label for="el-nuove">Aggiungi risposte, una per riga</label><textarea id="el-nuove" rows="3" placeholder="animali: cavallo&#10;cibi: uva"></textarea></div>' +
      '</div>';
    U.finestra('Elementi di “' + t.nome + '”', html, [
      { testo: 'Annulla', valore: null },
      { testo: 'Salva', classe: 'btn-primario', valore: true, invio: true }
    ], {
      larga: true,
      dopo: function (form) {
        form.querySelector('#el-righe').addEventListener('input', function (e) {
          var x = e.target;
          if (!x.hasAttribute('data-i')) return;
          el.voci[+x.getAttribute('data-i')][x.getAttribute('data-k')] = x.value;
        });
        form.querySelector('#el-righe').addEventListener('change', function (e) {
          var x = e.target;
          if (x.hasAttribute('data-i')) el.voci[+x.getAttribute('data-i')][x.getAttribute('data-k')] = x.value;
          if (x.hasAttribute('data-togli')) el.voci[+x.getAttribute('data-togli')]._togli = x.checked;
        });
      }
    }).then(function (r) {
      if (!r) return;
      var oggi = BR.datiFinti.dataISO(new Date());
      el.voci = el.voci.filter(function (v) { return !v._togli && String(v.testo).trim(); });
      el.voci.forEach(function (v) {
        v.testo = String(v.testo).trim();
        v.categoria = String(v.categoria || '').trim();
        if (v.stato === 'insegnamento' && !v.inizio) v.inizio = oggi;
        if (v.stato === 'acquisito' && !v.acquisito) v.acquisito = oggi;
        if (v.stato !== 'acquisito') v.acquisito = null;
      });
      R.aggiungiVoci(el, R.leggiRighe(r.form.querySelector('#el-nuove').value), 'coda');
      R.promuovi(el, oggi);
      t.elementi = el;
      ctx.salva();
      U.toast('Elementi salvati');
    });
  }

  // ---- Carta del grafico -------------------------------------------------------------

  function barra(p) {
    if (!p || !p.obiettivo) return '';
    return '<span class="barra-obiettivo" aria-hidden="true"><span style="width:' + Math.round(p.percentuale) + '%"></span></span>';
  }

  function cartaElementi(s, pr, t, punti, criterio) {
    var p = R.progresso(s, t);
    var stati = R.statoElementi(t, punti, criterio);
    var crit = criterio || R.CRITERIO_ELEMENTO;
    var ultimo = punti.length ? punti[punti.length - 1] : null;
    var mant = ultimo && ultimo.dettagli && ultimo.dettagli.mantenimento;
    var errori = R.erroriMantenimento(punti, 5);
    var nomi = {};
    R.repertorio(s).forEach(function (x) { nomi[x.id] = x.testo; });
    var daRipassare = Object.keys(errori).filter(function (k) { return errori[k] >= 2; });
    return '<div class="elementi-carta">' +
      '<div class="obiettivo-numerico' + (p.raggiunto ? ' raggiunto' : '') + '"><strong>' + (p.obiettivo ? p.acquisiti + ' di ' + p.obiettivo : p.acquisiti) + '</strong> ' +
        esc(nomeOperante(p.operante).toLowerCase()) + ' acquisiti' + (p.raggiunto ? ' · obiettivo raggiunto' : '') + barra(p) + '</div>' +
      (stati.length ? '<ul class="lista-elementi">' + stati.map(function (x) {
        var c = x.criterio;
        var testo = x.sessioni ? (c.raggiunto ? 'a criterio' : c.consecutive + ' di ' + crit.sessioni + ' sessioni a criterio') + ' · ultima ' + M.formatta(x.ultimo, 'dtt') + '%' : 'ancora nessuna prova';
        return '<li' + (x.pronto ? ' class="pronto"' : '') + '><span><strong>' + esc(x.voce.testo) + '</strong>' + (x.voce.categoria ? ' <span class="tenue">' + esc(x.voce.categoria) + '</span>' : '') + '</span>' +
          '<span class="tenue piccolo">' + esc(testo) + '</span>' +
          (x.pronto ? '<button class="btn btn-primario piccolo" type="button" data-azione="elemento-acquisito" data-programma="' + pr.id + '" data-target="' + t.id + '" data-id="' + x.voce.id + '">Segna acquisita</button>' : '') + '</li>';
      }).join('') + '</ul>' : '<p class="tenue piccolo">Nessuna risposta in insegnamento.</p>') +
      (mant ? '<p class="tenue piccolo">Richieste facili nell’ultima seduta: ' + mant.corrette + ' di ' + mant.prove + ' corrette e indipendenti.</p>' : '') +
      (daRipassare.length ? '<p class="avviso-ripasso piccolo">Da ripassare (errori sulle richieste facili nelle ultime 5 sedute): ' + daRipassare.map(function (k) { return '<strong>' + esc(nomi[k] || k) + '</strong>'; }).join(', ') + '.</p>' : '') +
      '</div>';
  }

  function segnaAcquisito(ctx, pr, t, voceId) {
    var r = R.segnaAcquisito(t.elementi, voceId);
    if (!r) return;
    ctx.salva();
    U.toast('“' + r.voce.testo + '” acquisita' + (r.promosse.length ? '; ora in insegnamento: ' + r.promosse.map(function (v) { return v.testo; }).join(', ') : ''));
  }

  // ---- Scheda Repertorio ----------------------------------------------------------------

  function vistaRepertorio(s, stato) {
    var rep = R.repertorio(s);
    var gruppi = R.perOperante(rep);
    var conElementi = A.targetDi(s).filter(function (x) { return R.elementi(x.target); });
    var errori = {};
    conElementi.forEach(function (x) {
      var e = R.erroriMantenimento(A.serie(stato, s, x.programma, x.target, { soloSincronizzate: true }), 5);
      Object.keys(e).forEach(function (k) { errori[k] = (errori[k] || 0) + e[k]; });
    });
    var html = '<div class="intro-riga"><p class="tenue intro">Le risposte che il paziente ha già, per operante e categoria: quelle presenti prima dei programmi e quelle acquisite nei target. Sul telefono diventano le richieste facili da alternare alle prove di training.</p>' +
      '<button class="btn btn-primario" type="button" data-azione="repertorio-aggiungi">+ Aggiungi risposte già presenti</button></div>';
    if (conElementi.length) {
      html += '<section class="carta"><h2>Obiettivi numerici</h2><ul class="lista-obiettivi">' + conElementi.map(function (x) {
        var p = R.progresso(s, x.target);
        return '<li><span><strong>' + esc(x.target.nome) + '</strong> <span class="tenue piccolo">' + esc(x.programma.nome) + (x.target.protocollo ? ' · ' + esc(x.target.protocollo.codice) : '') + '</span></span>' +
          '<span class="obiettivo-numerico' + (p.raggiunto ? ' raggiunto' : '') + '">' + esc(R.descriviProgresso(p)) + barra(p) + '</span></li>';
      }).join('') + '</ul></section>';
    }
    if (!rep.length) return html + '<div class="vuoto"><h3>Repertorio vuoto.</h3><p class="tenue">Aggiungi le risposte che il paziente ha già, oppure segna acquisite quelle dei target con un elenco di risposte.</p></div>';
    return html + Object.keys(gruppi).map(function (op) {
      var cat = gruppi[op];
      var n = Object.keys(cat).reduce(function (t, k) { return t + cat[k].length; }, 0);
      return '<section class="carta repertorio"><div class="programma-testa"><div><span class="etichetta">' + esc(R.OPERANTI[op].descrizione) + '</span><h2>' + esc(R.OPERANTI[op].nome) + ' <span class="tenue">' + n + '</span></h2></div></div>' +
        Object.keys(cat).sort().map(function (c) {
          return '<div class="categoria-rep"><h3>' + esc(c) + '</h3><div class="chips">' + cat[c].map(function (x) {
            var titolo = x.fonte === 'acquisito' ? 'Acquisita il ' + data(x.data) + ' in “' + x.targetNome + '”' : 'Già presente' + (x.data ? ' dal ' + data(x.data) : '');
            var err = errori[x.id] ? ' · ' + errori[x.id] + (errori[x.id] === 1 ? ' errore' : ' errori') + ' sulle richieste facili' : '';
            return '<span class="chip-rep ' + x.fonte + (errori[x.id] >= 2 ? ' ripasso' : '') + '" title="' + esc(titolo + err) + '">' + esc(x.testo) +
              (x.fonte === 'presente' ? '<button type="button" class="togli" data-azione="repertorio-togli" data-id="' + x.id + '" aria-label="Togli ' + esc(x.testo) + '">×</button>' : '') + '</span>';
          }).join('') + '</div></div>';
        }).join('') +
      '</section>';
    }).join('') +
    '<p class="tenue piccolo legenda-rep"><span class="chip-rep presente">già presente</span> <span class="chip-rep acquisito">acquisita in un target</span> <span class="chip-rep ripasso">da ripassare</span></p>';
  }

  function aggiungiRepertorio(ctx, s) {
    var html = '<div class="modulo"><div class="campi-riga">' +
      '<div class="campo"><label for="r-operante">Operante</label><select id="r-operante">' + opzioni(R.OPERANTI, 'tact') + '</select></div>' +
      '<div class="campo"><label for="r-categoria">Categoria (se non indicata nella riga)</label><input id="r-categoria" type="text" placeholder="Es. animali"></div>' +
      '<div class="campo"><label for="r-data">Rilevate il</label><input id="r-data" type="date" value="' + BR.datiFinti.dataISO(new Date()) + '"></div></div>' +
      '<div class="campo"><label for="r-righe">Risposte, una per riga</label><textarea id="r-righe" rows="6" placeholder="animali: cane&#10;animali: gatto&#10;cibi: pane"></textarea>' +
      '<span class="aiuto">Le risposte che il paziente emette già in modo affidabile, ad esempio dalla valutazione iniziale.</span></div></div>';
    U.finestra('Risposte già presenti', html, [
      { testo: 'Annulla', valore: null },
      { testo: 'Aggiungi', classe: 'btn-primario', valore: true, invio: true }
    ], { larga: true }).then(function (r) {
      if (!r) return;
      var f = r.form;
      var op = f.querySelector('#r-operante').value;
      var righe = R.leggiRighe(f.querySelector('#r-righe').value, f.querySelector('#r-categoria').value.trim());
      s.repertorio = s.repertorio || [];
      var gia = {};
      R.repertorio(s).forEach(function (x) { gia[x.operante + '|' + x.testo.toLowerCase()] = true; });
      var n = 0;
      righe.forEach(function (x) {
        if (gia[op + '|' + x.testo.toLowerCase()]) return;
        s.repertorio.push({ id: M.nuovoId('rp'), testo: x.testo, operante: op, categoria: x.categoria, data: f.querySelector('#r-data').value || null, nota: '' });
        n++;
      });
      ctx.salva();
      U.toast(n ? 'Aggiunte ' + n + ' risposte' : 'Nessuna risposta nuova');
    });
  }

  function togliRepertorio(ctx, s, id) {
    s.repertorio = (s.repertorio || []).filter(function (x) { return x.id !== id; });
    ctx.salva();
  }

  // ---- Scheda Protocolli ------------------------------------------------------------------

  var filtri = U.preferenza('desktop-protocolli') || { manuale: 'vbmapp', livello: '1', area: '' };

  function cambio(e) {
    var k = e.target.getAttribute && e.target.getAttribute('data-filtro-protocollo');
    if (!k) return false;
    filtri[k] = e.target.value;
    if (k === 'manuale') { filtri.livello = ''; filtri.area = ''; }
    U.preferenza('desktop-protocolli', filtri);
    return true;
  }

  function vistaProtocolli(s, stato) {
    var elenco = PR.manuali(stato);
    var m = elenco.find(function (x) { return x.id === filtri.manuale; }) || elenco[0];
    var voci = m.voci.filter(function (v) {
      return (!filtri.livello || String(v.livello) === String(filtri.livello)) && (!filtri.area || v.area === filtri.area);
    });
    var livelli = {};
    (m.livelli || []).forEach(function (l) { livelli[l.id] = l.nome + (l.eta ? ' (' + l.eta + ')' : ''); });
    var aree = {};
    (m.aree || []).forEach(function (a) { aree[a.id] = a.nome; });
    var html = '<div class="intro-riga"><p class="tenue intro">Libreria dei protocolli: scegli una milestone e crea l’obiettivo per il paziente, con l’elenco di risposte e l’obiettivo numerico. ' + esc(m.nota || '') + '</p>' +
      '<button class="btn" type="button" data-azione="protocollo-nuovo-manuale">+ Aggiungi un manuale</button></div>' +
      '<div class="filtri-protocolli campi-riga">' +
        '<div class="campo"><label for="pf-manuale">Manuale</label><select id="pf-manuale" data-filtro-protocollo="manuale">' + elenco.map(function (x) {
          return '<option value="' + esc(x.id) + '"' + (x.id === m.id ? ' selected' : '') + '>' + esc(x.nome) + '</option>';
        }).join('') + '</select></div>' +
        '<div class="campo"><label for="pf-livello">Livello</label><select id="pf-livello" data-filtro-protocollo="livello"><option value="">Tutti</option>' + opzioni(livelli, filtri.livello) + '</select></div>' +
        '<div class="campo"><label for="pf-area">Area</label><select id="pf-area" data-filtro-protocollo="area"><option value="">Tutte</option>' + opzioni(aree, filtri.area) + '</select></div>' +
      '</div>' +
      (m.titolo || m.autore ? '<p class="tenue piccolo">' + esc([m.titolo, m.autore].filter(Boolean).join(' · ')) + '</p>' : '') +
      (m.proprio ? '<div class="azioni-vista"><button class="btn btn-piatto" type="button" data-azione="protocollo-voci" data-manuale="' + esc(m.id) + '">+ Aggiungi voci a questo manuale</button></div>' : '');
    if (!voci.length) return html + '<div class="vuoto"><h3>Nessuna voce con questi filtri.</h3><p class="tenue">Cambia livello o area.</p></div>';
    // Raggruppate per area, nell'ordine del manuale.
    var perArea = [];
    voci.forEach(function (v) {
      var g = perArea.find(function (x) { return x.area === v.area; });
      if (!g) { g = { area: v.area, voci: [] }; perArea.push(g); }
      g.voci.push(v);
    });
    return html + perArea.map(function (g) {
      var a = PR.area(m, g.area) || { nome: g.area, descrizione: '' };
      return '<section class="carta protocollo"><div class="programma-testa"><div><span class="etichetta">' + esc(m.nome) + ' · ' + esc(nomeOperante(a.operante)) + '</span><h2>' + esc(a.nome) + '</h2>' +
        (a.descrizione ? '<p class="tenue piccolo">' + esc(a.descrizione) + '</p>' : '') + '</div></div>' +
        '<div class="tabella-box"><table class="tabella"><thead><tr><th>Codice</th><th>Livello</th><th>Descrizione</th><th class="num">Quantità</th><th>Per questo paziente</th><th></th></tr></thead><tbody>' +
        g.voci.map(function (v) {
          var coll = PR.targetCollegati(s, m.id, v.codice);
          return '<tr><td class="dato">' + esc(v.codice) + '</td><td>' + esc(v.livello) + '</td>' +
            '<td>' + (v.descrizione ? esc(v.descrizione) : '<span class="tenue">Da completare dalla tua copia del manuale</span>') + (v.personalizzata ? ' <span class="pillola senza-punto">tua</span>' : '') + '</td>' +
            '<td class="num">' + (v.quantita || '–') + '</td>' +
            '<td class="piccolo">' + (coll.length ? coll.map(function (x) { return esc(x.target.nome) + ' (' + esc(R.descriviProgresso(R.progresso(s, x.target)).split(' · ')[0]) + ')'; }).join('<br>') : '<span class="tenue">–</span>') + '</td>' +
            '<td class="num azioni-riga"><button class="btn btn-piatto piccolo" type="button" data-azione="protocollo-modifica" data-manuale="' + esc(m.id) + '" data-codice="' + esc(v.codice) + '">Completa</button>' +
            '<button class="btn piccolo" type="button" data-azione="protocollo-obiettivo" data-manuale="' + esc(m.id) + '" data-codice="' + esc(v.codice) + '">Crea obiettivo</button></td></tr>';
        }).join('') + '</tbody></table></div></section>';
    }).join('');
  }

  function modificaVoce(ctx, stato, manualeId, codice) {
    var v = PR.voce(stato, manualeId, codice);
    if (!v) return;
    var html = '<div class="modulo">' +
      '<div class="campo"><label for="mv-descrizione">Descrizione</label><textarea id="mv-descrizione" rows="3" placeholder="Con parole tue, dalla tua copia del manuale">' + esc(v.descrizione || '') + '</textarea></div>' +
      '<div class="campi-riga">' +
        '<div class="campo"><label for="mv-quantita">Quantità di risposte (se è un obiettivo numerico)</label><input id="mv-quantita" type="number" min="1" value="' + (v.quantita || '') + '"></div>' +
        '<div class="campo"><label for="mv-operante">Operante</label><select id="mv-operante">' + opzioni(R.OPERANTI, v.operante) + '</select></div>' +
      '</div><p class="tenue piccolo">Le modifiche valgono per tutti i pazienti e restano tue: il manuale integrato non cambia.</p></div>';
    U.finestra(codice, html, [
      { testo: 'Annulla', valore: null },
      { testo: 'Salva', classe: 'btn-primario', valore: true, invio: true }
    ], { larga: true }).then(function (r) {
      if (!r) return;
      var f = r.form;
      var q = +f.querySelector('#mv-quantita').value;
      PR.personalizza(stato, manualeId, codice, {
        descrizione: f.querySelector('#mv-descrizione').value.trim(),
        quantita: q > 0 ? Math.round(q) : null,
        operante: f.querySelector('#mv-operante').value
      });
      ctx.salva();
      U.toast('Milestone salvata');
    });
  }

  var AIUTO_VOCI = 'Una voce per riga: codice; area; livello; descrizione; quantità; operante. Servono almeno codice e area. Operanti: ' + Object.keys(R.OPERANTI).join(', ') + '.';

  function nuovoManuale(ctx, stato) {
    var html = '<div class="modulo">' +
      '<div class="campo"><label for="nm-nome">Nome del manuale o protocollo</label><input id="nm-nome" type="text" required placeholder="Es. ABLLS-R, EFL, PEAK, programma del centro"></div>' +
      '<div class="campo"><label for="nm-nota">Nota</label><input id="nm-nota" type="text" placeholder="Es. edizione, fonte"></div>' +
      '<div class="campo"><label for="nm-voci">Voci</label><textarea id="nm-voci" rows="8" placeholder="C1; Ascoltatore; 1; Segue istruzioni a un passo; ; ascoltatore&#10;G4; Tact; 1; Tact di oggetti comuni; 50; tact"></textarea><span class="aiuto">' + esc(AIUTO_VOCI) + '</span></div>' +
      '<p class="tenue piccolo">Anche qui: struttura e descrizioni brevi con parole tue, non il testo del manuale.</p></div>';
    U.finestra('Nuovo manuale', html, [
      { testo: 'Annulla', valore: null },
      { testo: 'Aggiungi manuale', classe: 'btn-primario', valore: true, invio: true }
    ], {
      larga: true,
      valida: function (f) { var n = f.querySelector('#nm-nome'); if (!n.value.trim()) { n.focus(); return false; } return true; }
    }).then(function (r) {
      if (!r) return;
      var f = r.form;
      var m = PR.nuovoManuale(stato, f.querySelector('#nm-nome').value.trim(), PR.leggiVoci(f.querySelector('#nm-voci').value), f.querySelector('#nm-nota').value.trim());
      filtri = { manuale: m.id, livello: '', area: '' };
      U.preferenza('desktop-protocolli', filtri);
      ctx.salva();
      U.toast('Manuale aggiunto con ' + m.voci.length + ' voci');
    });
  }

  function aggiungiVoci(ctx, stato, manualeId) {
    var m = (stato.config.protocolli || []).find(function (x) { return x.id === manualeId && x.tipo === 'manuale'; });
    if (!m) return;
    U.finestra('Voci di “' + m.nome + '”', '<div class="modulo"><div class="campo"><label for="nm-voci">Nuove voci</label><textarea id="nm-voci" rows="8"></textarea><span class="aiuto">' + esc(AIUTO_VOCI) + '</span></div></div>', [
      { testo: 'Annulla', valore: null },
      { testo: 'Aggiungi', classe: 'btn-primario', valore: true, invio: true }
    ], { larga: true }).then(function (r) {
      if (!r) return;
      var gia = {};
      m.voci.forEach(function (v) { gia[v.codice] = true; });
      var nuove = PR.leggiVoci(r.form.querySelector('#nm-voci').value).filter(function (v) { return !gia[v.codice]; });
      m.voci = m.voci.concat(nuove);
      ctx.salva();
      U.toast('Aggiunte ' + nuove.length + ' voci');
    });
  }

  // Crea un target DTT con elenco di risposte a partire da una milestone.
  function creaObiettivo(ctx, s, stato, manualeId, codice, dopo) {
    var m = PR.manuale(stato, manualeId);
    var v = PR.voce(stato, manualeId, codice);
    if (!m || !v) return;
    var a = PR.area(m, v.area) || { nome: v.area };
    var mod = PR.MODELLI[v.operante] || PR.MODELLI.altro;
    var programmi = s.programmi.filter(function (pr) { return pr.area === 'insegnare'; });
    var html = '<div class="modulo">' +
      '<p class="tenue piccolo">' + esc(m.nome) + ' · ' + esc(a.nome) + ' · livello ' + esc(v.livello) + (v.descrizione ? ' · ' + esc(v.descrizione) : '') + '</p>' +
      '<div class="campi-riga">' +
        '<div class="campo largo"><label for="o-nome">Nome del target</label><input id="o-nome" type="text" required value="' + esc(codice + ' · ' + (v.descrizione || mod.nome)) + '"></div>' +
        '<div class="campo"><label for="o-programma">Programma</label><select id="o-programma"><option value="">Nuovo: ' + esc(a.nome) + '</option>' +
          programmi.map(function (pr) { return '<option value="' + pr.id + '">' + esc(pr.nome) + '</option>'; }).join('') + '</select></div>' +
      '</div>' +
      '<div class="campi-riga">' +
        '<div class="campo"><label for="o-operante">Operante</label><select id="o-operante">' + opzioni(R.OPERANTI, v.operante) + '</select></div>' +
        '<div class="campo"><label for="o-quantita">Obiettivo: risposte acquisite</label><input id="o-quantita" type="number" min="1" placeholder="Dalla milestone" value="' + (v.quantita || '') + '"></div>' +
        '<div class="campo"><label for="o-insieme">In insegnamento insieme</label><input id="o-insieme" type="number" min="1" max="20" value="3"></div>' +
        '<div class="campo"><label for="o-prove">Prove di training per seduta</label><input id="o-prove" type="number" min="1" max="50" value="10"></div>' +
      '</div>' +
      '<div class="campo"><label for="o-conta">Per l’obiettivo contano</label><select id="o-conta">' + opzioni(CONTA, 'repertorio') + '</select></div>' +
      '<div class="campi-riga">' +
        '<label class="spunta piccolo"><input id="o-alterna" type="checkbox" checked> Alterna richieste facili su risposte già acquisite</label>' +
        '<div class="campo"><label for="o-ogni">Una richiesta facile ogni … prove di training</label><input id="o-ogni" type="number" min="1" max="10" value="1"></div>' +
      '</div>' +
      '<div class="campo"><label for="o-risposte">Risposte da insegnare, una per riga</label><textarea id="o-risposte" rows="5" placeholder="' + esc(mod.categorie.slice(0, 3).map(function (c) { return c.toLowerCase() + ': …'; }).join('\n')) + '"></textarea>' +
        '<span class="aiuto">La categoria prima dei due punti. Si possono aggiungere anche dopo, dal pulsante Elementi.' + (mod.categorie.length ? ' Categorie tipiche: ' + esc(mod.categorie.join(', ').toLowerCase()) + '.' : '') + '</span></div>' +
      (mod.istruzione ? '<p class="tenue piccolo">Procedura di partenza: ' + esc(mod.istruzione) + '. Criterio per ogni risposta e per il target: 90% indipendenti per 3 sessioni. Tutto si cambia poi dal target.</p>' : '') +
      '</div>';
    U.finestra('Crea obiettivo da ' + codice, html, [
      { testo: 'Annulla', valore: null },
      { testo: 'Crea obiettivo', classe: 'btn-primario', valore: true, invio: true }
    ], {
      larga: true,
      valida: function (f) { var n = f.querySelector('#o-nome'); if (!n.value.trim()) { n.focus(); return false; } return true; }
    }).then(function (r) {
      if (!r) return;
      var f = r.form;
      var q = function (sel) { return f.querySelector(sel).value; };
      var oggi = BR.datiFinti.dataISO(new Date());
      var pr = s.programmi.find(function (x) { return x.id === q('#o-programma'); });
      if (!pr) {
        pr = {
          id: M.nuovoId('pr'), nome: a.nome, area: 'insegnare', stato: 'attivo', target: [],
          piano: { modello: null, fasi: [{ id: M.nuovoId('pf'), tipo: 'baseline', nome: 'Baseline', descrizione: '', antecedenti: [], contingenze: [], criteri: {} }] }
        };
        pr.fasi = [{ id: M.nuovoId('fa'), tipo: 'baseline', inizio: oggi, nota: '', pianoId: pr.piano.fasi[0].id }];
        s.programmi.push(pr);
      }
      var operante = q('#o-operante');
      var mo = PR.MODELLI[operante] || PR.MODELLI.altro;
      var el = R.nuoviElementi(operante);
      el.obiettivo = +q('#o-quantita') > 0 ? Math.round(+q('#o-quantita')) : null;
      el.conta = q('#o-conta');
      el.inContemporanea = Math.max(Math.round(+q('#o-insieme') || 3), 1);
      el.alternanza = { attiva: f.querySelector('#o-alterna').checked, ogni: Math.max(Math.round(+q('#o-ogni') || 1), 1) };
      R.aggiungiVoci(el, R.leggiRighe(q('#o-risposte')), 'coda');
      R.promuovi(el, oggi);
      var t = {
        id: M.nuovoId('tg'), nome: q('#o-nome').trim(), direzione: 'aumentare', ruolo: 'abilita',
        definizione: { include: 'Risposta corretta entro 5 secondi dall’istruzione, senza aiuti, per ciascuna risposta dell’elenco.', esclude: 'Risposte dopo un prompt o oltre i 5 secondi.', esempi: '', inizio: '', fine: '' },
        metodo: { id: M.nuovoId('me'), tipo: 'dtt', versione: 1, parametri: { prove: Math.max(Math.round(+q('#o-prove') || 10), 1) }, criterio: { soglia: 90, verso: 'almeno', sessioni: 3 } },
        obiettivo: { condizione: '' },
        insegnamento: { formato: 'dtt', istruzione: mo.istruzione, materiali: mo.materiali, prompt: { strategia: 'meno_intrusivo', ritardoSec: 0, sfumatura: '' }, correzione: mo.correzione, rinforzoDifferenziale: true },
        generalizzazione: { persone: [], luoghi: [], materiali: [] },
        elementi: el,
        protocollo: { manuale: m.id, nomeManuale: m.nome, codice: codice }
      };
      pr.target.push(t);
      s.schedule.voci.push({ targetId: t.id });
      ctx.salva();
      U.toast('Obiettivo creato in “' + pr.nome + '” e aggiunto alla seduta');
      if (dopo) dopo(pr, t);
    });
  }

  root.BR.desktopRepertorio = {
    campiTarget: campiTarget, attivaCampi: attivaCampi, leggiTarget: leggiTarget,
    riassuntoTabella: riassuntoTabella, gestisciElementi: gestisciElementi,
    cartaElementi: cartaElementi, segnaAcquisito: segnaAcquisito,
    vistaRepertorio: vistaRepertorio, aggiungiRepertorio: aggiungiRepertorio, togliRepertorio: togliRepertorio,
    vistaProtocolli: vistaProtocolli, cambio: cambio, modificaVoce: modificaVoce,
    nuovoManuale: nuovoManuale, aggiungiVoci: aggiungiVoci, creaObiettivo: creaObiettivo
  };
})(window);
