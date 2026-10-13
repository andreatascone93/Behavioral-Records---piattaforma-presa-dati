/*
 * Grafici secondo le convenzioni ABA, disegnati in SVG:
 * sessioni sull'asse orizzontale, una linea per fase interrotta al cambio,
 * linea verticale tratteggiata con il nome della fase, linea del criterio.
 * I colori arrivano dal tema tramite classi CSS (vedi css/tema.css).
 */
(function (root) {
  'use strict';

  var M = root.BR.modello;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Massimo "tondo" per l'asse verticale e passo delle tacche.
  function scala(max) {
    if (!(max > 0)) max = 1;
    var grezzo = max / 4;
    var pot = Math.pow(10, Math.floor(Math.log10(grezzo)));
    var passi = [1, 2, 2.5, 5, 10];
    var passo = pot;
    for (var i = 0; i < passi.length; i++) {
      if (passi[i] * pot >= grezzo) { passo = passi[i] * pot; break; }
    }
    return { max: Math.ceil(max / passo) * passo, passo: passo };
  }

  function dataBreve(ms) {
    var d = new Date(ms);
    return d.getDate() + '/' + (d.getMonth() + 1);
  }

  /*
   * opzioni: { punti: [{ valore, fase, sessione }], tipo, criterio, titolo,
   *            larghezza, altezza }
   */
  function aba(o) {
    var W = o.larghezza || 640, H = o.altezza || 240;
    var sx = 44, dx = 58, su = 42, giu = 34;
    var tipo = M.TIPI[o.tipo];
    var percentuale = /%/.test(tipo.unita);
    var punti = o.punti;
    var n = Math.max(punti.length, 1);

    var massimo = 0;
    punti.forEach(function (p) { if (p.valore != null && p.valore > massimo) massimo = p.valore; });
    if (o.criterio) massimo = Math.max(massimo, o.criterio.soglia);
    var sc = percentuale ? { max: 100, passo: 25 } : scala(massimo * 1.1);

    var X = function (i) { return sx + 12 + (n === 1 ? 0 : (i * (W - sx - dx - 24)) / (n - 1)); };
    var Y = function (v) { return su + (H - su - giu) * (1 - v / sc.max); };

    var parti = [];
    parti.push('<svg class="grafico" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' +
      esc((o.titolo || 'Grafico') + ', ' + tipo.unita + ' per sessione') + '">');

    // Griglia e asse verticale
    for (var v = 0; v <= sc.max + 1e-9; v += sc.passo) {
      var y = Y(v).toFixed(1);
      parti.push('<line class="g-griglia" x1="' + sx + '" x2="' + (W - dx) + '" y1="' + y + '" y2="' + y + '"/>');
      parti.push('<text class="g-tacca" x="' + (sx - 8) + '" y="' + (+y + 4) + '" text-anchor="end">' +
        String(+v.toFixed(2)).replace('.', ',') + '</text>');
    }
    parti.push('<line class="g-asse" x1="' + sx + '" x2="' + sx + '" y1="' + su + '" y2="' + (H - giu) + '"/>');
    parti.push('<line class="g-asse" x1="' + sx + '" x2="' + (W - dx) + '" y1="' + (H - giu) + '" y2="' + (H - giu) + '"/>');

    // Tacche orizzontali: numero di sessione, al massimo ~10 etichette
    var ogni = Math.max(1, Math.ceil(n / 10));
    punti.forEach(function (p, i) {
      if (i % ogni !== 0 && i !== n - 1) return;
      parti.push('<text class="g-tacca" x="' + X(i).toFixed(1) + '" y="' + (H - giu + 16) + '" text-anchor="middle">' + (i + 1) + '</text>');
    });
    parti.push('<text class="g-titolo-asse" x="' + (W - dx + 6) + '" y="' + (H - giu + 16) + '">Sessioni</text>');
    parti.push('<text class="g-titolo-asse" x="4" y="12">' + esc(tipo.unita) + '</text>');

    // Cambi di fase
    var inizioFase = 0;
    punti.forEach(function (p, i) {
      var ultima = i === n - 1;
      var cambia = !ultima && punti[i + 1].fase !== p.fase;
      if (cambia || ultima) {
        var xa = inizioFase === 0 ? sx : (X(inizioFase - 1) + X(inizioFase)) / 2;
        parti.push('<text class="g-fase" x="' + (xa + 6).toFixed(1) + '" y="' + (su - 8) + '">' + esc(M.FASI[p.fase] || p.fase) + '</text>');
        if (cambia) {
          var xl = ((X(i) + X(i + 1)) / 2).toFixed(1);
          parti.push('<line class="g-cambio" x1="' + xl + '" x2="' + xl + '" y1="' + (su - 18) + '" y2="' + (H - giu) + '"/>');
        }
        inizioFase = i + 1;
      }
    });

    // Criterio
    if (o.criterio) {
      var yc = Y(o.criterio.soglia).toFixed(1);
      parti.push('<line class="g-criterio" x1="' + sx + '" x2="' + (W - dx + 2) + '" y1="' + yc + '" y2="' + yc + '"/>');
      parti.push('<text class="g-criterio-testo" x="' + (W - dx + 6) + '" y="' + (+yc + 4) + '">Criterio</text>');
    }

    // Linee: solo tra sessioni consecutive della stessa fase
    var tratto = [];
    function chiudi() {
      if (tratto.length > 1) parti.push('<polyline class="g-linea" points="' + tratto.join(' ') + '"/>');
      tratto = [];
    }
    punti.forEach(function (p, i) {
      if (p.valore == null) { chiudi(); return; }
      if (i > 0 && punti[i - 1].fase !== p.fase) chiudi();
      tratto.push(X(i).toFixed(1) + ',' + Y(Math.min(p.valore, sc.max)).toFixed(1));
    });
    chiudi();

    // Punti, con un'area di tocco più grande per il suggerimento
    punti.forEach(function (p, i) {
      if (p.valore == null) return;
      var cx = X(i).toFixed(1), cy = Y(Math.min(p.valore, sc.max)).toFixed(1);
      var info = 'Sessione ' + (i + 1) + ' · ' + dataBreve(p.sessione.inizio) + ' · ' +
        (M.FASI[p.fase] || p.fase) + '\n' + M.formatta(p.valore, o.tipo) + ' ' + tipo.unita;
      parti.push('<circle class="g-punto' + (i === n - 1 ? ' g-ultimo' : '') + '" cx="' + cx + '" cy="' + cy + '" r="4"/>');
      parti.push('<circle class="g-tocco" cx="' + cx + '" cy="' + cy + '" r="11" data-info="' + esc(info) + '" tabindex="0"><title>' + esc(info) + '</title></circle>');
    });

    if (!punti.length) {
      parti.push('<text class="g-vuoto" x="' + (W / 2) + '" y="' + (H / 2) + '" text-anchor="middle">Ancora nessuna sessione registrata</text>');
    }

    parti.push('</svg>');
    return parti.join('');
  }

  // Mini-linea per il riepilogo sul telefono.
  function mini(valori, opzioni) {
    var o = opzioni || {};
    var W = o.larghezza || 120, H = o.altezza || 36, m = 4;
    var vs = valori.filter(function (v) { return v != null; });
    if (!vs.length) return '<svg class="mini" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true"></svg>';
    var max = o.max != null ? o.max : Math.max.apply(null, vs.concat(o.soglia || 0)) * 1.1 || 1;
    var X = function (i) { return m + (vs.length === 1 ? (W - 2 * m) / 2 : (i * (W - 2 * m)) / (vs.length - 1)); };
    var Y = function (v) { return m + (H - 2 * m) * (1 - v / max); };
    var pts = vs.map(function (v, i) { return X(i).toFixed(1) + ',' + Y(v).toFixed(1); });
    var out = '<svg class="mini" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">';
    if (o.soglia != null) {
      var ys = Y(o.soglia).toFixed(1);
      out += '<line class="g-criterio" x1="0" x2="' + W + '" y1="' + ys + '" y2="' + ys + '"/>';
    }
    out += '<polygon class="mini-area" points="' + X(0).toFixed(1) + ',' + (H - m) + ' ' + pts.join(' ') + ' ' + X(vs.length - 1).toFixed(1) + ',' + (H - m) + '"/>';
    out += '<polyline class="g-linea" points="' + pts.join(' ') + '"/>';
    var last = vs.length - 1;
    out += '<circle class="g-punto g-ultimo" cx="' + X(last).toFixed(1) + '" cy="' + Y(vs[last]).toFixed(1) + '" r="3.5"/>';
    return out + '</svg>';
  }

  // Suggerimento al passaggio del mouse o al tocco sui punti.
  function attivaSuggerimenti(contenitore) {
    var tip = document.createElement('div');
    tip.className = 'suggerimento';
    tip.hidden = true;
    document.body.appendChild(tip);
    function mostra(el) {
      tip.textContent = el.getAttribute('data-info');
      tip.hidden = false;
      var r = el.getBoundingClientRect();
      var t = tip.getBoundingClientRect();
      var left = Math.min(Math.max(8, r.left + r.width / 2 - t.width / 2), window.innerWidth - t.width - 8);
      tip.style.left = left + window.scrollX + 'px';
      tip.style.top = r.top + window.scrollY - t.height - 8 + 'px';
    }
    function nascondi() { tip.hidden = true; }
    contenitore.addEventListener('pointerover', function (e) {
      var el = e.target.closest && e.target.closest('[data-info]');
      if (el) mostra(el);
    });
    contenitore.addEventListener('pointerout', function (e) {
      if (e.target.closest && e.target.closest('[data-info]')) nascondi();
    });
    contenitore.addEventListener('focusin', function (e) {
      var el = e.target.closest && e.target.closest('[data-info]');
      if (el) mostra(el);
    });
    contenitore.addEventListener('focusout', nascondi);
  }

  root.BR.grafico = { aba: aba, mini: mini, attivaSuggerimenti: attivaSuggerimenti, esc: esc };
})(typeof window !== 'undefined' ? window : globalThis);
