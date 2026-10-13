/*
 * Prototipo desktop, scheda "Schedule di seduta": la scaletta della seduta in
 * blocchi (accoglienza, probe, baseline, insegnamento, pause, probe
 * ritardato, chiusura), i target misurati per tutta la seduta, la proposta
 * automatica e i controlli sui tempi. La logica sta in seduta.js.
 */
(function (root) {
  'use strict';

  var M = root.BR.modello, S = root.BR.seduta, U = root.BR.ui, A = root.BR.archivio;
  var esc = U.esc;


  function nomiTarget(s) {
    var out = {};
    A.targetDi(s).forEach(function (x) { out[x.target.id] = x; });
    return out;
  }

  function vociDellaSchedule(s) {
    var tutti = nomiTarget(s);
    return s.schedule.voci.map(function (v) { return tutti[v.targetId]; }).filter(Boolean);
  }

  // Sezione "Scaletta della seduta" sotto le impostazioni.
  function vista(s) {
    var sc = s.schedule;
    var blocchi = sc.blocchi || [];
    var voci = vociDellaSchedule(s);
    var intro = '<h2>Scaletta della seduta</h2>' +
      '<p class="tenue piccolo">Dividi la seduta in blocchi: probe a freddo prima di insegnare, blocchi di insegnamento con le pause, un probe ritardato per vedere se la risposta si mantiene. Sul telefono la seduta segue la scaletta e ogni dato registrato ricorda in quale blocco è stato preso, così i grafici separano i probe dall’insegnamento.</p>';
    if (!blocchi.length) {
      return '<section class="carta scaletta">' + intro +
        '<div class="scaletta-vuota"><p>Ancora nessuna scaletta: sul telefono la seduta mostra tutti i target insieme.</p>' +
        '<div class="azioni-riga"><button class="btn btn-primario" type="button" data-azione="scaletta-proponi"' + (voci.length ? '' : ' disabled') + '>Proponi una scaletta di ' + sc.durataMin + ' minuti</button>' +
        aggiungiBlocco() + '</div></div></section>';
    }
    var avvisi = S.verifica(s);
    var tot = S.somma(blocchi);
    var orari = S.orari(blocchi);
    return '<section class="carta scaletta">' + intro +
      barra(blocchi, Math.max(tot, +sc.durataMin)) +
      '<p class="scaletta-totale"><span class="dato">' + tot + '</span> di <span class="dato">' + sc.durataMin + '</span> minuti previsti' +
        (tot === +sc.durataMin ? ' <span class="pillola bene">Tempi in ordine</span>' : '') + '</p>' +
      (avvisi.length ? '<ul class="scaletta-avvisi">' + avvisi.map(function (a) {
        return '<li class="' + a.livello + '">' + esc(a.testo) + '</li>';
      }).join('') + '</ul>' : '') +
      continui(s, voci) +
      '<ol class="blocchi">' + blocchi.map(function (b, i) { return rigaBlocco(s, b, i, orari[i], blocchi.length, voci); }).join('') + '</ol>' +
      '<div class="azioni-riga">' + aggiungiBlocco() +
        '<button class="btn btn-piatto" type="button" data-azione="scaletta-proponi">Proponi di nuovo</button>' +
        '<button class="btn btn-piatto btn-pericolo" type="button" data-azione="scaletta-svuota">Togli la scaletta</button>' +
      '</div>' +
    '</section>';
  }

  // Barra orizzontale proporzionale ai minuti, un colore per contesto.
  function barra(blocchi, totale) {
    return '<div class="scaletta-barra" role="img" aria-label="' + esc(blocchi.map(function (b) { return b.nome + ' ' + b.durataMin + ' minuti'; }).join(', ')) + '">' +
      blocchi.map(function (b) {
        var tipo = S.TIPI[b.tipo] || S.TIPI.attivita;
        return '<span class="ctx-' + tipo.contesto + '" style="flex-grow:' + Math.max(+b.durataMin || 0, 0.5) + '" title="' + esc(b.nome + ' · ' + b.durataMin + ' min') + '">' +
          (b.durataMin / totale >= 0.08 ? esc(tipo.breve) : '') + '</span>';
      }).join('') + '</div>' +
      '<div class="legenda scaletta-legenda">' +
        '<span><i class="ctx-probe"></i>Probe</span><span><i class="ctx-insegnamento"></i>Insegnamento</span>' +
        '<span><i class="ctx-baseline"></i>Baseline</span><span><i class="ctx-nessuno"></i>Senza prove</span></div>';
  }

  function continui(s, voci) {
    var sc = s.schedule;
    var lista = sc.continui || [];
    if (!voci.length) return '';
    return '<fieldset class="continui"><legend>Per tutta la seduta</legend>' +
      '<p class="tenue piccolo">Questi target restano sempre sullo schermo, in ogni blocco: di solito i comportamenti problema e le misure continue (frequenza, durata, intervalli, ABC).</p>' +
      '<div class="spunte">' + voci.map(function (x) {
        var dentro = lista.indexOf(x.target.id) !== -1;
        return '<label class="spunta piccolo"><input type="checkbox" data-continuo="' + x.target.id + '"' + (dentro ? ' checked' : '') + '> ' +
          esc(x.target.nome) + ' <span class="tenue">(' + esc(M.TIPI[x.target.metodo.tipo].nome.toLowerCase()) + ')</span></label>';
      }).join('') + '</div></fieldset>';
  }

  function aggiungiBlocco() {
    return '<span class="aggiungi-blocco"><select id="sc-nuovo-blocco" aria-label="Tipo di blocco da aggiungere">' +
      Object.keys(S.TIPI).map(function (k) { return '<option value="' + k + '">' + esc(S.TIPI[k].nome) + '</option>'; }).join('') +
      '</select><button class="btn" type="button" data-azione="blocco-aggiungi">Aggiungi blocco</button></span>';
  }

  function rigaBlocco(s, b, i, orario, n, voci) {
    var tipo = S.TIPI[b.tipo] || S.TIPI.attivita;
    var att = ' data-id="' + b.id + '"';
    var continuiIds = s.schedule.continui || [];
    var candidati = voci.filter(function (x) { return continuiIds.indexOf(x.target.id) === -1; });
    return '<li class="blocco ctx-bordo-' + tipo.contesto + '">' +
      '<div class="blocco-testa">' +
        '<span class="blocco-orario dato">' + orario.inizio + '–' + orario.fine + '′</span>' +
        '<select aria-label="Tipo di blocco" data-campo-blocco="tipo"' + att + '>' + Object.keys(S.TIPI).map(function (k) {
          return '<option value="' + k + '"' + (k === b.tipo ? ' selected' : '') + '>' + esc(S.TIPI[k].nome) + '</option>';
        }).join('') + '</select>' +
        '<input type="text" aria-label="Nome del blocco" value="' + esc(b.nome) + '" data-campo-blocco="nome"' + att + '>' +
        '<label class="blocco-durata"><input type="number" min="1" max="240" value="' + b.durataMin + '" data-campo-blocco="durataMin"' + att + '> min</label>' +
        '<div class="voce-azioni">' +
          '<button class="btn btn-piatto" type="button" aria-label="Sposta su" data-azione="blocco-sposta" data-verso="-1"' + att + (i === 0 ? ' disabled' : '') + '>↑</button>' +
          '<button class="btn btn-piatto" type="button" aria-label="Sposta giù" data-azione="blocco-sposta" data-verso="1"' + att + (i === n - 1 ? ' disabled' : '') + '>↓</button>' +
          '<button class="btn btn-piatto" type="button" aria-label="Duplica" title="Duplica" data-azione="blocco-duplica"' + att + '>⧉</button>' +
          '<button class="btn btn-piatto btn-pericolo" type="button" data-azione="blocco-togli"' + att + '>Togli</button>' +
        '</div>' +
      '</div>' +
      '<p class="tenue piccolo blocco-descr">' + esc(tipo.descrizione) + '</p>' +
      (tipo.prove ? '<div class="blocco-corpo">' +
        '<div class="spunte">' + (candidati.length ? candidati.map(function (x) {
          var dentro = b.targetIds.indexOf(x.target.id) !== -1;
          return '<label class="spunta piccolo"><input type="checkbox" data-blocco-target="' + x.target.id + '"' + att + (dentro ? ' checked' : '') + '> ' + esc(x.target.nome) + '</label>';
        }).join('') : '<span class="tenue piccolo">Nessun target a prove discrete nella seduta.</span>') + '</div>' +
        '<div class="campi-riga stretti">' +
          '<div class="campo"><label for="pv-' + b.id + '">Prove per target</label><input id="pv-' + b.id + '" type="number" min="1" max="100" placeholder="come da metodo" value="' + (b.prove || '') + '" data-campo-blocco="prove"' + att + '></div>' +
          (b.tipo === 'probe_ritardato' ? '<div class="campo"><label for="rt-' + b.id + '">Ritardo minimo dall’insegnamento (min)</label><input id="rt-' + b.id + '" type="number" min="0" max="1440" value="' + (b.ritardoMin || 0) + '" data-campo-blocco="ritardoMin"' + att + '></div>' : '') +
        '</div></div>' : '') +
      '<input class="blocco-nota" type="text" placeholder="Nota per l’operatore (materiali, rinforzatori, istruzioni)" aria-label="Nota per l’operatore" value="' + esc(b.nota || '') + '" data-campo-blocco="nota"' + att + '>' +
    '</li>';
  }

  // Anteprima sul telefono: la scaletta con gli orari previsti.
  function anteprima(s) {
    var sc = s.schedule;
    var blocchi = sc.blocchi || [];
    if (!blocchi.length) return null;
    var tutti = nomiTarget(s);
    var orari = S.orari(blocchi);
    var cont = (sc.continui || []).map(function (id) { return tutti[id]; }).filter(Boolean);
    return (cont.length ? '<div class="tm-voce tm-continui"><span class="tm-strumento">Per tutta la seduta</span>' + cont.map(function (x) { return '<span>' + esc(x.target.nome) + '</span>'; }).join('') + '</div>' : '') +
      blocchi.map(function (b, i) {
        var tipo = S.TIPI[b.tipo] || S.TIPI.attivita;
        return '<div class="tm-voce tm-blocco ctx-bordo-' + tipo.contesto + '"><span>' + esc(b.nome) + '</span>' +
          '<span class="tm-strumento">' + orari[i].inizio + '–' + orari[i].fine + ' min' + (b.targetIds.length && tipo.prove ? ' · ' + b.targetIds.length + ' target' : '') + '</span></div>';
      }).join('');
  }

  // ---- Azioni -----------------------------------------------------------------

  function trova(s, id) { return (s.schedule.blocchi || []).find(function (b) { return b.id === id; }); }

  function proponi(ctx, s) {
    var esegui = function () {
      var p = S.proponi(s);
      s.schedule.blocchi = p.blocchi;
      s.schedule.continui = p.continui;
      ctx.salva();
      U.toast(p.note.length ? p.note[0] : 'Scaletta proposta: modificala come serve');
    };
    if (!(s.schedule.blocchi || []).length) { esegui(); return; }
    U.conferma('Proporre una nuova scaletta?', 'La scaletta attuale verrà sostituita da una proposta per ' + s.schedule.durataMin + ' minuti.', 'Sostituisci', 'btn-primario')
      .then(function (ok) { if (ok) esegui(); });
  }

  // Gestisce i clic della scaletta; true se l'azione era sua.
  function clic(ctx, s, az, b) {
    var sc = s.schedule;
    var id = b.getAttribute('data-id');
    switch (az) {
      case 'scaletta-proponi': proponi(ctx, s); return true;
      case 'scaletta-svuota':
        U.conferma('Togliere la scaletta?', 'Sul telefono la seduta tornerà a mostrare tutti i target insieme. Le sedute già registrate non cambiano.', 'Togli', 'btn-pericolo')
          .then(function (ok) { if (!ok) return; sc.blocchi = []; ctx.salva(); });
        return true;
      case 'blocco-aggiungi': {
        var sel = document.getElementById('sc-nuovo-blocco');
        var tipo = sel ? sel.value : 'insegnamento';
        var discreti = vociDellaSchedule(s).filter(function (x) { return S.discreto(x.target) && (sc.continui || []).indexOf(x.target.id) === -1; })
          .map(function (x) { return x.target.id; });
        var nuovo = S.blocco(tipo, tipo === 'pausa' ? S.PREDEFINITI.pausaMin : 5, S.TIPI[tipo].prove ? discreti : []);
        if (tipo === 'probe_ritardato') nuovo.ritardoMin = S.PREDEFINITI.ritardoProbeMin;
        sc.blocchi = (sc.blocchi || []).concat([nuovo]);
        ctx.salva();
        return true;
      }
      case 'blocco-sposta': {
        var l = sc.blocchi, i = l.findIndex(function (x) { return x.id === id; }), j = i + +b.getAttribute('data-verso');
        if (i < 0 || j < 0 || j >= l.length) return true;
        var tmp = l[i]; l[i] = l[j]; l[j] = tmp;
        ctx.salva();
        return true;
      }
      case 'blocco-duplica': {
        var orig = trova(s, id);
        if (!orig) return true;
        var copia = JSON.parse(JSON.stringify(orig));
        copia.id = M.nuovoId('bl');
        sc.blocchi.splice(sc.blocchi.indexOf(orig) + 1, 0, copia);
        ctx.salva();
        return true;
      }
      case 'blocco-togli':
        sc.blocchi = sc.blocchi.filter(function (x) { return x.id !== id; });
        ctx.salva();
        return true;
    }
    return false;
  }

  // Gestisce i cambi nei campi della scaletta; true se il campo era suo.
  function cambio(ctx, s, e) {
    var el = e.target;
    if (!el.getAttribute) return false;
    var sc = s.schedule;
    var cont = el.getAttribute('data-continuo');
    if (cont) {
      var lista = (sc.continui || []).filter(function (x) { return x !== cont; });
      if (el.checked) {
        lista.push(cont);
        // Un target di tutta la seduta non serve anche dentro i blocchi.
        (sc.blocchi || []).forEach(function (b) { b.targetIds = b.targetIds.filter(function (x) { return x !== cont; }); });
      }
      sc.continui = lista;
      ctx.salva();
      return true;
    }
    var bt = el.getAttribute('data-blocco-target');
    if (bt) {
      var bl = trova(s, el.getAttribute('data-id'));
      if (!bl) return true;
      bl.targetIds = bl.targetIds.filter(function (x) { return x !== bt; });
      if (el.checked) {
        // Nell'ordine della schedule.
        var ordine = sc.voci.map(function (v) { return v.targetId; });
        bl.targetIds.push(bt);
        bl.targetIds.sort(function (a, b2) { return ordine.indexOf(a) - ordine.indexOf(b2); });
      }
      ctx.salva();
      return true;
    }
    var campo = el.getAttribute('data-campo-blocco');
    if (!campo) return false;
    var b = trova(s, el.getAttribute('data-id'));
    if (!b) return true;
    var v = el.value;
    if (campo === 'durataMin') b.durataMin = Math.max(1, Math.round(+v) || b.durataMin);
    else if (campo === 'prove') b.prove = +v > 0 ? Math.round(+v) : null;
    else if (campo === 'ritardoMin') b.ritardoMin = Math.max(0, Math.round(+v) || 0);
    else if (campo === 'tipo') {
      var vecchio = S.TIPI[b.tipo];
      // Il nome segue il tipo finché non è stato personalizzato.
      if (!b.nome || (vecchio && b.nome === vecchio.nome)) b.nome = S.TIPI[v].nome;
      b.tipo = v;
      if (!S.TIPI[v].prove) b.targetIds = [];
      if (v === 'probe_ritardato' && b.ritardoMin == null) b.ritardoMin = S.PREDEFINITI.ritardoProbeMin;
    } else b[campo] = v;
    ctx.salva();
    return true;
  }

  // Quando un target esce dalla seduta esce anche dalla scaletta; quando entra
  // ed è una misura continua, va tra quelli di tutta la seduta.
  function targetTolto(s, id) {
    var sc = s.schedule;
    sc.continui = (sc.continui || []).filter(function (x) { return x !== id; });
    (sc.blocchi || []).forEach(function (b) { b.targetIds = b.targetIds.filter(function (x) { return x !== id; }); });
  }

  function targetAggiunto(s, id) {
    var sc = s.schedule;
    if (!(sc.blocchi || []).length) return;
    var x = A.trovaTarget(s, id);
    if (x && !S.discreto(x.target) && (sc.continui || []).indexOf(id) === -1) sc.continui = (sc.continui || []).concat([id]);
  }

  // Blocchi svolti in una seduta registrata, per la scheda Sessioni.
  function svolti(sess) {
    var r = S.riassuntoSvolti(sess);
    if (!r.length) return '';
    return '<div class="svolti"><span class="etichetta">Scaletta svolta</span><ol>' + r.map(function (x) {
      var tipo = S.TIPI[x.tipo] || S.TIPI.attivita;
      var reale = x.minuti == null ? 'in corso' : M.formatta(x.minuti, 'durata') + ' min';
      return '<li class="ctx-bordo-' + tipo.contesto + '"><span>' + esc(x.nome) + '</span><span class="dato tenue">' + reale + (x.previstiMin ? ' su ' + x.previstiMin : '') + '</span></li>';
    }).join('') + '</ol></div>';
  }

  root.BR.desktopSeduta = {
    vista: vista, anteprima: anteprima, clic: clic, cambio: cambio,
    targetTolto: targetTolto, targetAggiunto: targetAggiunto, svolti: svolti
  };
})(typeof window !== 'undefined' ? window : globalThis);
