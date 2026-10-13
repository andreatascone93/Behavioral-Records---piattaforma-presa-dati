/*
 * Pannello Cloud, uguale su desktop e telefono: collegarsi con il proprio
 * account, vedere lo stato della sincronizzazione e i conflitti, installare
 * l'app. Usa la finestra modale di ui.js.
 */
(function (root) {
  'use strict';

  var U = root.BR.ui, C = root.BR.cloud;
  var esc = U.esc;

  // Testo breve per la pillola nella barra.
  function etichetta(i) {
    if (!i.attivo) return { testo: 'Solo su questo dispositivo', classe: '' };
    if (i.fase === 'errore') return { testo: 'Cloud: errore', classe: 'critico' };
    if (i.fase === 'offline') return { testo: 'Cloud: offline', classe: 'attenzione' };
    if (i.fase === 'in-corso') return { testo: 'Sincronizzo…', classe: 'penna' };
    if (i.conflitti.length) return { testo: 'Cloud: ' + i.conflitti.length + (i.conflitti.length === 1 ? ' conflitto' : ' conflitti'), classe: 'attenzione' };
    return { testo: i.ultima ? 'Cloud alle ' + U.ora(i.ultima) : 'Cloud collegato', classe: 'bene' };
  }

  function bloccoInstalla() {
    var P = root.BR.pwa;
    if (!P || !P.installabile()) return '';
    return '<p class="tenue piccolo">Puoi installare l’app su questo dispositivo: si apre come un’app e funziona anche senza rete.</p>';
  }

  function azioneInstalla() {
    var P = root.BR.pwa;
    return P && P.installabile() ? [{ testo: 'Installa l’app', valore: 'installa' }] : [];
  }

  function apri(errore) {
    return C.attivo() ? apriCollegato() : apriAccesso(errore);
  }

  function apriAccesso(errore) {
    var i = C.info();
    var msg = errore || i.errore;
    var avanzate =
      '<div class="campo"><label for="cl-url">Indirizzo del progetto</label><input id="cl-url" name="url" type="url" required placeholder="https://xxxx.supabase.co" value="' + esc(i.url) + '"></div>' +
      '<div class="campo"><label for="cl-chiave">Chiave pubblica (anon)</label><input id="cl-chiave" name="chiave" type="text" required autocomplete="off" spellcheck="false" value="' + esc(i.chiave) + '"></div>';
    var corpo =
      '<p>Ora i dati sono <strong>solo su questo dispositivo</strong>. Collegandoti al cloud dello studio, le sedute registrate qui arrivano al desktop e agli altri telefoni.</p>' +
      (msg ? '<p class="errore-testo" role="alert">' + esc(msg) + '</p>' : '') +
      (i.configurato ? '<details class="cloud-avanzate"><summary>Progetto: ' + esc(i.url.replace(/^https?:\/\//, '')) + '</summary>' + avanzate + '</details>' : avanzate) +
      '<div class="campo"><label for="cl-email">Email</label><input id="cl-email" name="email" type="email" required autocomplete="username"></div>' +
      '<div class="campo"><label for="cl-password">Password</label><input id="cl-password" name="password" type="password" required autocomplete="current-password"></div>' +
      '<p class="tenue piccolo">Se il cloud ha già dati, questo dispositivo li prende e invia solo le sedute registrate qui. I dati di esempio vanno nel cloud solo se è vuoto.</p>' +
      bloccoInstalla();
    return U.finestra('Cloud', '<div class="cloud-corpo">' + corpo + '</div>', azioneInstalla().concat([
      { testo: 'Annulla', valore: null },
      { testo: 'Collega', classe: 'btn-primario', valore: 'collega', invio: true }
    ])).then(function (r) {
      if (!r) return null;
      if (r.valore === 'installa') { root.BR.pwa.installa(); return null; }
      var f = r.form.elements;
      U.toast('Collegamento in corso…');
      return C.collega(f.url.value, f.chiave.value, f.email.value, f.password.value).then(function (esito) {
        if (!esito) { var dopo = C.info(); return apri(dopo.errore || 'Collegato, ma la prima sincronizzazione non è riuscita.'); }
        U.toast(esito.primo && esito.ricevuti ? 'Collegato: dati del cloud caricati' : 'Collegato al cloud');
        return esito;
      }, function (e) { return apriAccesso(e.message); });
    });
  }

  function descrivi(c) {
    var d = c.copiaLocale || {};
    if (c.tipo === 'soggetto') return 'Paziente ' + (d.codice || c.id);
    if (c.tipo === 'sessione') return 'Seduta del ' + (d.inizio ? U.data(d.inizio) : '?');
    if (c.tipo === 'operatore') return 'Operatore ' + (d.nome || c.id);
    return c.tipo + ' ' + c.id;
  }

  function scaricaConflitti(conflitti) {
    var blob = new Blob([JSON.stringify(conflitti, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'conflitti-behavioral-records.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  function apriCollegato() {
    var i = C.info();
    var fase = { collegato: 'Collegato', 'in-corso': 'Sincronizzazione in corso', offline: 'Offline: riprova quando torna la rete', errore: 'Errore' }[i.fase] || i.fase;
    var corpo =
      '<dl class="cloud-dati">' +
        '<dt>Account</dt><dd>' + esc(i.email || '—') + '</dd>' +
        '<dt>Studio</dt><dd>' + esc(i.studio || '—') + '</dd>' +
        '<dt>Stato</dt><dd>' + esc(fase) + '</dd>' +
        '<dt>Ultima sincronizzazione</dt><dd>' + (i.ultima ? esc(U.data(i.ultima)) + ' alle ' + esc(U.ora(i.ultima)) : 'mai') + '</dd>' +
        '<dt>Da inviare</dt><dd class="dato">' + i.inAttesa + (i.inAttesa === 1 ? ' evento' : ' eventi') + '</dd>' +
      '</dl>' +
      (i.errore ? '<p class="errore-testo" role="alert">' + esc(i.errore) + '</p>' : '') +
      (i.conflitti.length
        ? '<div class="avviso"><div><strong>' + i.conflitti.length + (i.conflitti.length === 1 ? ' modifica non applicata' : ' modifiche non applicate') + '</strong>' +
          '<p>Qualcuno ha salvato la stessa configurazione da un altro dispositivo prima di te: vale la sua versione. Le tue copie sono conservate qui.</p>' +
          '<ul class="cloud-conflitti">' + i.conflitti.slice(-8).map(function (c) {
            return '<li>' + esc(descrivi(c)) + ' <span class="tenue">· ' + esc(U.data(c.quando)) + ' ' + esc(U.ora(c.quando)) + '</span></li>';
          }).join('') + '</ul></div></div>'
        : '') +
      bloccoInstalla();
    var azioni = azioneInstalla();
    if (i.conflitti.length) azioni = azioni.concat([{ testo: 'Scarica le copie', valore: 'scarica' }, { testo: 'Svuota l’elenco', valore: 'svuota' }]);
    azioni = azioni.concat([
      { testo: 'Esci dal cloud', classe: 'btn-pericolo', valore: 'esci' },
      { testo: 'Chiudi', valore: null },
      { testo: 'Sincronizza ora', classe: 'btn-primario', valore: 'sincronizza', invio: true }
    ]);
    return U.finestra('Cloud', '<div class="cloud-corpo">' + corpo + '</div>', azioni).then(function (r) {
      if (!r) return null;
      switch (r.valore) {
        case 'installa': root.BR.pwa.installa(); return null;
        case 'scarica': scaricaConflitti(i.conflitti); return apriCollegato();
        case 'svuota': C.scartaConflitti(); return apriCollegato();
        case 'sincronizza':
          return C.sincronizzaOra().then(function (esito) {
            var dopo = C.info();
            U.toast(esito ? 'Sincronizzato' : (dopo.errore || 'Sincronizzazione non riuscita'));
          });
        case 'esci':
          return U.conferma('Uscire dal cloud?', 'I dati restano su questo dispositivo ma smettono di sincronizzarsi. ' +
            (i.inAttesa ? 'Ci sono ' + i.inAttesa + ' eventi non ancora inviati: partiranno quando ti ricolleghi.' : ''), 'Esci', 'btn-pericolo')
            .then(function (ok) { if (ok) return C.scollega().then(function () { U.toast('Uscito dal cloud'); }); });
      }
      return null;
    });
  }

  root.BR.pannelloCloud = { apri: apri, etichetta: etichetta };
})(window);
