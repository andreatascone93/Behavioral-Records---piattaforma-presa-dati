/*
 * Service worker: conserva l'app sul dispositivo così si apre e funziona
 * anche senza rete. I file dell'app si servono dalla copia locale e si
 * aggiornano in sottofondo; alla riapertura successiva si usa la versione
 * nuova. Le chiamate al cloud (POST verso Supabase) non passano di qui.
 * Cambiare VERSIONE a ogni pubblicazione che modifica l'elenco dei file.
 */
'use strict';

var VERSIONE = 'br-app-1';
var FONT = 'br-font-1';
var FILE = [
  './',
  'index.html',
  'desktop.html',
  'mobile.html',
  'manifest.webmanifest',
  'config.js',
  'css/tema.css',
  'css/desktop.css',
  'css/mobile.css',
  'js/modello.js',
  'js/piano.js',
  'js/dati-finti.js',
  'js/deposito.js',
  'js/archivio.js',
  'js/sincronizzazione.js',
  'js/grafico.js',
  'js/ui.js',
  'js/cloud.js',
  'js/cloud-ui.js',
  'js/pwa.js',
  'js/desktop-piano.js',
  'js/desktop-preferenze.js',
  'js/desktop.js',
  'js/mobile.js',
  'icone/icona.svg',
  'icone/icona-192.png',
  'icone/icona-512.png',
  'icone/icona-maskable-512.png',
  'icone/apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSIONE).then(function (c) {
    return c.addAll(FILE.map(function (f) { return new Request(f, { cache: 'reload' }); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (chiavi) {
    return Promise.all(chiavi.filter(function (k) { return k !== VERSIONE && k !== FONT; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

// Copia locale subito, aggiornamento dalla rete in sottofondo.
function localeEPoiRete(richiesta, nomeCache, chiave) {
  return caches.open(nomeCache).then(function (cache) {
    return cache.match(chiave || richiesta).then(function (copia) {
      var rete = fetch(richiesta).then(function (r) {
        if (r && (r.ok || r.type === 'opaque')) cache.put(chiave || richiesta, r.clone());
        return r;
      });
      if (copia) {
        rete.catch(function () { /* offline: va bene la copia */ });
        return copia;
      }
      return rete;
    });
  });
}

self.addEventListener('fetch', function (e) {
  var r = e.request;
  if (r.method !== 'GET') return;
  var url = new URL(r.url);
  if (url.origin === self.location.origin) {
    // index.html?app=1 e simili usano la stessa copia della pagina.
    var chiave = r.mode === 'navigate' ? new Request(url.origin + url.pathname) : null;
    e.respondWith(localeEPoiRete(r, VERSIONE, chiave));
  } else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(localeEPoiRete(r, FONT));
  }
});
