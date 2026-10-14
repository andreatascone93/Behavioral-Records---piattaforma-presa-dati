/* Piccoli aiuti di interfaccia condivisi tra desktop e mobile. */
(function (root) {
  'use strict';

  var esc = root.BR.grafico.esc;

  function toast(testo) {
    var vecchio = document.querySelector('.toast');
    if (vecchio) vecchio.remove();
    var t = document.createElement('div');
    t.className = 'toast';
    t.setAttribute('role', 'status');
    t.textContent = testo;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }

  // Finestra modale costruita nella pagina (confirm() non è disponibile ovunque).
  // contenuto: HTML; azioni: [{ testo, classe, valore }]. Restituisce una Promise.
  function finestra(titolo, contenuto, azioni, opzioni) {
    var o = opzioni || {};
    return new Promise(function (risolvi) {
      var velo = document.createElement('div');
      velo.className = 'velo';
      velo.innerHTML =
        '<form class="finestra' + (o.larga ? ' larga' : '') + '" role="dialog" aria-modal="true" aria-labelledby="finestra-titolo">' +
        '<h2 id="finestra-titolo">' + esc(titolo) + '</h2>' +
        '<div class="finestra-corpo">' + contenuto + '</div>' +
        '<div class="azioni">' + azioni.map(function (a, i) {
          return '<button type="' + (a.invio ? 'submit' : 'button') + '" class="btn ' + (a.classe || '') + '" data-i="' + i + '">' + esc(a.testo) + '</button>';
        }).join('') + '</div></form>';
      document.body.appendChild(velo);
      var form = velo.querySelector('form');
      var primo = form.querySelector('input, select, textarea') || form.querySelector('.btn-primario') || form.querySelector('button');
      if (primo) primo.focus();

      function fine(valore) {
        velo.remove();
        document.removeEventListener('keydown', tasto);
        risolvi(valore);
      }
      function tasto(e) { if (e.key === 'Escape') fine(null); }
      document.addEventListener('keydown', tasto);

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (o.valida && !o.valida(form)) return;
        var a = azioni.find(function (x) { return x.invio; });
        fine({ valore: a ? a.valore : true, form: form });
      });
      form.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-i]');
        if (!b || b.type === 'submit') return;
        var a = azioni[+b.getAttribute('data-i')];
        fine(a.valore == null ? null : { valore: a.valore, form: form });
      });
      velo.addEventListener('click', function (e) { if (e.target === velo) fine(null); });
      if (o.dopo) o.dopo(form);
    });
  }

  function conferma(titolo, testo, testoSi, classe) {
    return finestra(titolo, '<p>' + esc(testo) + '</p>', [
      { testo: 'Annulla', valore: null },
      { testo: testoSi || 'Conferma', classe: classe || 'btn-primario', valore: true, invio: true }
    ]).then(function (r) { return !!r; });
  }

  function ora(ms) {
    return new Date(ms).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  }
  function data(ms, lunga) {
    return new Date(ms).toLocaleDateString('it-IT', lunga
      ? { weekday: 'long', day: 'numeric', month: 'long' }
      : { day: 'numeric', month: 'short' });
  }
  function mmss(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }
  function eta(anno) { return new Date().getFullYear() - anno; }
  function giorniFa(ms) {
    var a = new Date(); a.setHours(0, 0, 0, 0);
    var b = new Date(ms); b.setHours(0, 0, 0, 0);
    var g = Math.round((a - b) / 86400000);
    if (g <= 0) return 'oggi';
    if (g === 1) return 'ieri';
    return g + ' giorni fa';
  }

  // Preferenze della singola persona (scheda aperta, paziente scelto).
  function preferenza(chiave, valore) {
    var k = 'behavioral-records-ui-' + chiave;
    try {
      if (arguments.length > 1) { localStorage.setItem(k, JSON.stringify(valore)); return valore; }
      var v = localStorage.getItem(k);
      return v ? JSON.parse(v) : null;
    } catch (e) { return null; }
  }

  // Le interfacce si ridisegnano con innerHTML: prima si annota quale controllo
  // ha il fuoco (dai suoi attributi data-*), dopo lo si ritrova e lo si rimette.
  var ATTRIBUTI_FUOCO = ['id', 'data-azione', 'data-id', 'data-prompt', 'data-indice', 'data-valore', 'data-presente',
    'data-n', 'data-verso', 'data-fase', 'data-programma'];
  function chiaveFuoco(contenitore) {
    var el = document.activeElement;
    if (!el || el === document.body || !contenitore.contains(el)) return null;
    var parti = ATTRIBUTI_FUOCO.filter(function (a) { return el.hasAttribute(a); }).map(function (a) {
      return '[' + a + '="' + el.getAttribute(a).replace(/["\\]/g, '\\$&') + '"]';
    });
    return parti.length ? el.tagName.toLowerCase() + parti.join('') : null;
  }
  function rimettiFuoco(contenitore, chiave) {
    if (!chiave) return;
    var el = contenitore.querySelector(chiave);
    if (el && el !== document.activeElement) {
      try { el.focus({ preventScroll: true }); } catch (e) { /* non focalizzabile */ }
    }
  }

  root.BR.ui = {
    esc: esc, toast: toast, finestra: finestra, conferma: conferma,
    ora: ora, data: data, mmss: mmss, eta: eta, giorniFa: giorniFa, preferenza: preferenza,
    chiaveFuoco: chiaveFuoco, rimettiFuoco: rimettiFuoco
  };
})(window);
