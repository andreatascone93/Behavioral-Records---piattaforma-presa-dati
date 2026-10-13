/*
 * Collegamento al cloud nel browser: conserva indirizzo, chiave pubblica e
 * accesso dell'operatore, e fa girare la sincronizzazione (all'avvio, dopo
 * ogni dato registrato, quando torna la rete, ogni minuto). Il lavoro vero
 * lo fa sincronizzazione.js; qui ci sono solo tempi, stato e preferenze.
 *
 * Indirizzo e chiave arrivano da config.js (impostati da chi pubblica l'app)
 * oppure dal pannello Cloud. La chiave "anon" di Supabase è pubblica per
 * natura: la protezione dei dati sta nelle regole del database.
 */
(function (root) {
  'use strict';

  var A = root.BR.archivio, S = root.BR.sincronizzazione, D = root.BR.deposito;
  var CHIAVE_IMPOSTAZIONI = 'behavioral-records-cloud';
  var CHIAVE_SESSIONE = 'cloud-sessione';
  var OGNI_MS = 60000;

  var impostazioni = leggiImpostazioni();
  var sessione = null;
  var trasporto = null;
  var stato = { fase: 'locale', errore: null, ultimo: null };
  var inCorso = null, ancora = false, timer = null, intervallo = null;
  var ascoltatori = [];

  function leggiImpostazioni() {
    var base = root.BR_CONFIG && root.BR_CONFIG.supabase ? root.BR_CONFIG.supabase : {};
    var salvate = null;
    try { salvate = JSON.parse(root.localStorage.getItem(CHIAVE_IMPOSTAZIONI) || 'null'); } catch (e) { /* niente */ }
    return {
      url: (salvate && salvate.url) || base.url || '',
      chiave: (salvate && salvate.chiave) || base.chiave || ''
    };
  }

  function salvaImpostazioni(url, chiave) {
    impostazioni = { url: url, chiave: chiave };
    try { root.localStorage.setItem(CHIAVE_IMPOSTAZIONI, JSON.stringify(impostazioni)); } catch (e) { /* resta per questa pagina */ }
  }

  function conservaSessione(s) {
    sessione = s;
    if (!D) return;
    (s ? D.scrivi(CHIAVE_SESSIONE, s) : D.cancella(CHIAVE_SESSIONE)).catch(function () { /* deposito assente */ });
  }

  function creaTrasporto() {
    trasporto = S.supabase({ url: impostazioni.url, chiave: impostazioni.chiave, sessione: sessione, salvaSessione: conservaSessione });
  }

  function cambia(fase, errore) {
    stato.fase = fase;
    stato.errore = errore || null;
    ascoltatori.forEach(function (cb) { cb(info()); });
  }

  function attivo() { return !!(sessione && impostazioni.url && impostazioni.chiave); }

  function info() {
    var s = A.attuale();
    var sy = s && s.sync;
    return {
      configurato: !!(impostazioni.url && impostazioni.chiave),
      attivo: attivo(),
      fase: attivo() ? stato.fase : 'locale',
      errore: stato.errore,
      url: impostazioni.url,
      chiave: impostazioni.chiave,
      email: sessione && sessione.utente ? sessione.utente.email : null,
      studio: sy ? sy.studioNome || sy.studio : null,
      ultima: sy ? sy.ultima : null,
      conflitti: sy ? sy.conflitti : [],
      inAttesa: s ? A.inAttesa(s) : 0,
      ultimo: stato.ultimo
    };
  }

  // ---- Ciclo ---------------------------------------------------------------------

  function sincronizzaOra() {
    if (!attivo()) return Promise.resolve(null);
    if (inCorso) { ancora = true; return inCorso; }
    var s = A.attuale();
    if (!s || !A.online(s)) { cambia('offline'); return Promise.resolve(null); }
    cambia('in-corso');
    inCorso = S.ciclo(s, trasporto).then(function (r) {
      // Se nel frattempo un'altra scheda ha sostituito i dati, si rifà il giro.
      if (A.attuale() !== s) { ancora = true; return r; }
      A.salva(s);
      stato.ultimo = r;
      if (r.ricevuti || r.primo || r.conflitti) A.notifica(s);
      cambia('collegato');
      if (r.conflitti && root.BR.ui) root.BR.ui.toast('Una modifica è arrivata da un altro dispositivo: la tua copia è tra i conflitti del cloud.');
      return r;
    }, function (e) {
      if (A.attuale() === s) A.salva(s); // gli esiti già applicati restano
      if (e.codice === 'accesso') { conservaSessione(null); creaTrasporto(); }
      cambia(e.codice === 'rete' ? 'offline' : 'errore', e.message);
      return null;
    }).then(function (r) {
      inCorso = null;
      if (ancora) { ancora = false; sincronizzaPresto(); }
      return r;
    });
    return inCorso;
  }

  // Raggruppa i tocchi ravvicinati in un solo giro.
  function sincronizzaPresto() {
    if (!attivo()) return;
    clearTimeout(timer);
    timer = setTimeout(sincronizzaOra, 1500);
  }

  function avviaTempi() {
    if (intervallo) return;
    intervallo = setInterval(function () {
      if (root.document && root.document.visibilityState === 'hidden') return;
      sincronizzaOra();
    }, OGNI_MS);
  }

  // ---- Accesso -------------------------------------------------------------------

  function collega(url, chiave, email, password) {
    salvaImpostazioni(String(url || '').trim(), String(chiave || '').trim());
    sessione = null;
    creaTrasporto();
    cambia('in-corso');
    return trasporto.accedi(String(email || '').trim(), password).then(function () {
      avviaTempi();
      return sincronizzaOra();
    }, function (e) {
      cambia('locale', e.message);
      throw e;
    });
  }

  function scollega() {
    var t = trasporto;
    sessione = null;
    conservaSessione(null);
    creaTrasporto();
    cambia('locale');
    return t ? t.esci() : Promise.resolve();
  }

  function avvia() {
    var p = D ? D.leggi(CHIAVE_SESSIONE).catch(function () { return null; }) : Promise.resolve(null);
    return p.then(function (s) {
      sessione = s || null;
      creaTrasporto();
      if (!attivo()) { cambia('locale'); return; }
      cambia('collegato');
      avviaTempi();
      sincronizzaOra();
    });
  }

  if (root.addEventListener) {
    root.addEventListener('online', function () { sincronizzaOra(); });
    root.addEventListener('offline', function () { if (attivo()) cambia('offline'); });
  }
  if (root.document) {
    root.document.addEventListener('visibilitychange', function () {
      if (root.document.visibilityState === 'visible') sincronizzaOra();
    });
  }

  function suCambio(cb) { ascoltatori.push(cb); }

  function scartaConflitti() {
    var s = A.attuale();
    if (s && s.sync) { s.sync.conflitti = []; A.salva(s); }
    cambia(stato.fase);
  }

  root.BR.cloud = {
    avvia: avvia, attivo: attivo, info: info, collega: collega, scollega: scollega,
    sincronizzaOra: sincronizzaOra, sincronizzaPresto: sincronizzaPresto,
    suCambio: suCambio, scartaConflitti: scartaConflitti
  };
})(window);
