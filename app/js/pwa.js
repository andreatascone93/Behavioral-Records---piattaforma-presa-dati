/*
 * App installabile: registra il service worker (che conserva l'app sul
 * dispositivo per usarla senza rete) e tiene da parte l'invito del browser
 * a installarla, così il pannello Cloud può offrirlo.
 */
(function (root) {
  'use strict';

  var invito = null;

  if ('serviceWorker' in root.navigator && /^https?:$/.test(root.location.protocol)) {
    root.addEventListener('load', function () {
      root.navigator.serviceWorker.register('sw.js').catch(function (e) {
        if (root.console) root.console.warn('Service worker non registrato', e);
      });
    });
  }

  root.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    invito = e;
  });
  root.addEventListener('appinstalled', function () { invito = null; });

  function installata() {
    return (root.matchMedia && root.matchMedia('(display-mode: standalone)').matches) || root.navigator.standalone === true;
  }

  function installabile() { return !!invito && !installata(); }

  function installa() {
    if (!invito) return Promise.resolve(false);
    var e = invito;
    invito = null;
    e.prompt();
    return e.userChoice.then(function (r) { return r && r.outcome === 'accepted'; });
  }

  root.BR = root.BR || {};
  root.BR.pwa = { installabile: installabile, installa: installa, installata: installata };
})(window);
