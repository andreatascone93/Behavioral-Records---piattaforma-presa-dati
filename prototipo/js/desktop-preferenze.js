/*
 * Prototipo desktop, scheda "Preferenze": le valutazioni delle preferenze di
 * ogni paziente (scelta a coppie, MSWO, stimolo singolo, operante libero).
 * La valutazione più recente suggerisce i rinforzatori nel piano di intervento.
 */
(function (root) {
  'use strict';

  var M = root.BR.modello, P = root.BR.piano, U = root.BR.ui;
  var esc = U.esc;

  function giorno(iso) { return new Date(iso + 'T12:00:00'); }
  function oggiISO() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function numero(v) { return String(Math.round(v * 10) / 10).replace('.', ','); }

  var NOMI_LIVELLO = { alta: 'Alta', media: 'Media', bassa: 'Bassa' };

  function vista(s, stato) {
    var elenco = (s.preferenze || []).slice().sort(function (a, b) { return a.data < b.data ? 1 : -1; });
    var sugg = P.suggerimentiRinforzatori(s);
    var html = '<div class="intro-riga"><p class="tenue intro">Le valutazioni delle preferenze dicono quali stimoli usare come rinforzatori. La più recente compare come suggerimento nei campi “Rinforzatore” del piano di intervento.</p>' +
      '<button class="btn btn-primario" type="button" data-azione="nuova-preferenza">+ Nuova valutazione</button></div>';
    if (sugg.scaduta) {
      html += '<p class="avviso-pref">L’ultima valutazione ha ' + sugg.giorni + ' giorni. Le preferenze cambiano nel tempo: conviene rifarla (suggerito ogni ' + P.PREFERENZE_SCADENZA_GIORNI + ' giorni).</p>';
    }
    if (!elenco.length) {
      return html + '<div class="vuoto"><h3>Nessuna valutazione delle preferenze.</h3><p class="tenue">Aggiungine una prima di scegliere i rinforzatori del piano.</p></div>';
    }
    return html + elenco.map(function (v, i) { return carta(v, i === 0, stato); }).join('');
  }

  function carta(v, ultima, stato) {
    var m = P.METODI_PREFERENZA[v.metodo] || { nome: v.metodo, misura: '' };
    var op = stato && root.BR.archivio.operatore(stato, v.operatore);
    var classifica = P.classificaPreferenze(v);
    return '<section class="carta preferenza' + (ultima ? ' ultima' : '') + '">' +
      '<div class="programma-testa"><div>' +
        '<span class="etichetta">' + esc(m.nome) + (m.fonte ? ' · ' + esc(m.fonte) : '') + '</span>' +
        '<h2>' + esc(U.data(giorno(v.data).getTime(), true)) + (ultima ? ' <span class="pillola penna">Più recente</span>' : '') + '</h2>' +
        (op ? '<p class="tenue piccolo">' + esc(op.nome) + '</p>' : '') +
      '</div><div class="programma-azioni">' +
        '<button class="btn" type="button" data-azione="modifica-preferenza" data-id="' + v.id + '">Modifica</button>' +
      '</div></div>' +
      '<ol class="classifica">' + classifica.map(function (x) {
        return '<li class="livello-' + x.livello + '">' +
          '<span class="classifica-nome">' + esc(x.nome) + '</span>' +
          '<span class="pref-barra" aria-hidden="true"><span style="width:' + Math.round(x.punteggio * 100) + '%"></span></span>' +
          '<span class="dato">' + numero(x.valore) + '</span>' +
          '<span class="pillola livello">' + NOMI_LIVELLO[x.livello] + '</span></li>';
      }).join('') + '</ol>' +
      '<p class="tenue piccolo">Valore: ' + esc(m.misura) + '.' + (v.note ? ' ' + esc(v.note) : '') + '</p>' +
    '</section>';
  }

  function modifica(ctx, s, esistente) {
    var nuova = !esistente;
    var v = nuova
      ? { id: M.nuovoId('vp'), data: oggiISO(), metodo: 'paired', operatore: '', note: '', stimoli: [] }
      : JSON.parse(JSON.stringify(esistente));
    // Una nuova valutazione riparte dagli stimoli della precedente.
    if (nuova) {
      var prec = P.ultimaPreferenza(s);
      v.stimoli = prec ? prec.stimoli.map(function (x) { return { nome: x.nome, valore: null }; }) : [];
    }
    while (v.stimoli.length < 5) v.stimoli.push({ nome: '', valore: null });

    function righe() {
      var m = P.METODI_PREFERENZA[v.metodo];
      return '<p class="aiuto piccolo" id="pv-aiuto">' + esc(m.aiuto) + '</p>' +
        v.stimoli.map(function (x, r) {
          return '<div class="campi-riga riga-stimolo">' +
            '<div class="campo largo"><label>Stimolo ' + (r + 1) + '</label><input type="text" data-stimolo="' + r + '" data-k="nome" value="' + esc(x.nome || '') + '" placeholder="Es. bolle di sapone"></div>' +
            '<div class="campo"><label>' + esc(m.misura) + '</label><input type="number" step="any" min="' + (m.crescente ? 1 : 0) + '"' + (m.massimo ? ' max="' + m.massimo + '"' : '') + ' data-stimolo="' + r + '" data-k="valore" value="' + (x.valore == null ? '' : x.valore) + '"></div>' +
          '</div>';
        }).join('') +
        '<button class="btn btn-piatto" type="button" data-aggiungi-stimolo>+ Aggiungi stimolo</button>';
    }

    var html = '<div class="modulo">' +
      '<div class="campi-riga">' +
        '<div class="campo"><label for="pv-data">Data</label><input id="pv-data" type="date" required value="' + esc(v.data) + '"></div>' +
        '<div class="campo largo"><label for="pv-metodo">Metodo</label><select id="pv-metodo">' +
          Object.keys(P.METODI_PREFERENZA).map(function (k) {
            var m = P.METODI_PREFERENZA[k];
            return '<option value="' + k + '"' + (k === v.metodo ? ' selected' : '') + '>' + esc(m.nome + ' (' + m.fonte + ')') + '</option>';
          }).join('') + '</select></div>' +
        '<div class="campo"><label for="pv-operatore">Operatore</label><select id="pv-operatore"><option value="">—</option>' +
          s.operatori.map(function (id) {
            var o = ctx.operatore(id);
            return '<option value="' + id + '"' + (id === v.operatore ? ' selected' : '') + '>' + esc(o ? o.nome : id) + '</option>';
          }).join('') + '</select></div>' +
      '</div>' +
      '<fieldset><legend>Stimoli</legend><div id="pv-stimoli"></div></fieldset>' +
      '<div class="campo"><label for="pv-note">Note</label><textarea id="pv-note" placeholder="Condizioni, numero di somministrazioni, osservazioni">' + esc(v.note || '') + '</textarea></div>' +
    '</div>';

    var azioni = [{ testo: 'Annulla', valore: null }];
    if (!nuova) azioni.push({ testo: 'Elimina', classe: 'btn-pericolo', valore: 'elimina' });
    azioni.push({ testo: nuova ? 'Aggiungi valutazione' : 'Salva', classe: 'btn-primario', valore: true, invio: true });

    U.finestra(nuova ? 'Nuova valutazione delle preferenze' : 'Modifica valutazione', html, azioni, {
      larga: true,
      dopo: function (form) {
        var box = form.querySelector('#pv-stimoli');
        box.innerHTML = righe();
        form.querySelector('#pv-metodo').addEventListener('change', function (e) { v.metodo = e.target.value; box.innerHTML = righe(); });
        box.addEventListener('input', function (e) {
          var el = e.target;
          if (!el.hasAttribute('data-stimolo')) return;
          var x = v.stimoli[+el.getAttribute('data-stimolo')];
          x[el.getAttribute('data-k')] = el.getAttribute('data-k') === 'valore' ? (el.value === '' ? null : +el.value) : el.value;
        });
        box.addEventListener('click', function (e) {
          if (!e.target.closest('[data-aggiungi-stimolo]')) return;
          v.stimoli.push({ nome: '', valore: null });
          box.innerHTML = righe();
        });
      }
    }).then(function (r) {
      if (!r) return;
      s.preferenze = s.preferenze || [];
      if (r.valore === 'elimina') {
        s.preferenze = s.preferenze.filter(function (x) { return x.id !== v.id; });
        ctx.salva();
        U.toast('Valutazione eliminata');
        return;
      }
      var f = r.form;
      v.data = f.querySelector('#pv-data').value || oggiISO();
      v.operatore = f.querySelector('#pv-operatore').value;
      v.note = f.querySelector('#pv-note').value.trim();
      v.stimoli = v.stimoli
        .map(function (x) { return { nome: (x.nome || '').trim(), valore: x.valore }; })
        .filter(function (x) { return x.nome; });
      var i = s.preferenze.findIndex(function (x) { return x.id === v.id; });
      if (i === -1) s.preferenze.push(v); else s.preferenze[i] = v;
      ctx.salva();
      U.toast(nuova ? 'Valutazione aggiunta' : 'Valutazione salvata');
    });
  }

  root.BR.desktopPreferenze = { vista: vista, modifica: modifica };
})(window);
