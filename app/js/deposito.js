/*
 * Deposito sul dispositivo: IndexedDB, l'archivio del browser pensato per
 * grandi quantità di dati e più resistente di localStorage. Chiave → valore.
 * Le scritture sulla stessa chiave non si accavallano: se ne arriva una
 * mentre un'altra è in corso, si scrive solo l'ultima appena possibile.
 * Se IndexedDB non c'è (alcuni browser in navigazione privata, file aperti
 * con doppio clic su browser vecchi) disponibile() risponde false e
 * l'archivio usa localStorage come nei prototipi.
 */
(function (root) {
  'use strict';

  var NOME = 'behavioral-records';
  var TABELLA = 'kv';
  var db = null;

  function apri() {
    if (db) return db;
    db = new Promise(function (risolvi) {
      var idb;
      try { idb = root.indexedDB; } catch (e) { idb = null; }
      if (!idb) { risolvi(null); return; }
      var r;
      try { r = idb.open(NOME, 1); } catch (e) { risolvi(null); return; }
      r.onupgradeneeded = function () { r.result.createObjectStore(TABELLA); };
      r.onsuccess = function () {
        var d = r.result;
        // Un'altra scheda con una versione più nuova chiede di aggiornare lo schema.
        d.onversionchange = function () { d.close(); };
        risolvi(d);
      };
      r.onerror = function () { risolvi(null); };
      r.onblocked = function () { risolvi(null); };
    });
    return db;
  }

  function disponibile() { return apri().then(function (d) { return !!d; }); }

  function richiesta(modo, fai) {
    return apri().then(function (d) {
      if (!d) throw new Error('IndexedDB non disponibile');
      return new Promise(function (risolvi, rifiuta) {
        var tx = d.transaction(TABELLA, modo);
        var r = fai(tx.objectStore(TABELLA));
        tx.oncomplete = function () { risolvi(r && r.result); };
        tx.onerror = function () { rifiuta(tx.error); };
        tx.onabort = function () { rifiuta(tx.error || new Error('scrittura annullata')); };
      });
    });
  }

  function leggi(chiave) {
    return richiesta('readonly', function (s) { return s.get(chiave); });
  }

  var inCorso = {};
  var prossimo = {};

  function scrivi(chiave, valore) {
    if (inCorso[chiave]) {
      prossimo[chiave] = valore;
      return inCorso[chiave];
    }
    // put() copia il valore subito: le modifiche successive non toccano questa scrittura.
    var p = richiesta('readwrite', function (s) { return s.put(valore, chiave); });
    inCorso[chiave] = p.then(dopo, function (e) { dopo(); throw e; });
    return inCorso[chiave];

    function dopo() {
      delete inCorso[chiave];
      if (Object.prototype.hasOwnProperty.call(prossimo, chiave)) {
        var v = prossimo[chiave];
        delete prossimo[chiave];
        return scrivi(chiave, v);
      }
    }
  }

  function cancella(chiave) {
    return richiesta('readwrite', function (s) { return s.delete(chiave); });
  }

  // Chiede al browser di non cancellare i dati quando manca spazio.
  function persisti() {
    try {
      if (root.navigator && root.navigator.storage && root.navigator.storage.persist) {
        return root.navigator.storage.persist().catch(function () { return false; });
      }
    } catch (e) { /* non supportato */ }
    return Promise.resolve(false);
  }

  root.BR = root.BR || {};
  root.BR.deposito = { disponibile: disponibile, leggi: leggi, scrivi: scrivi, cancella: cancella, persisti: persisti };
})(typeof window !== 'undefined' ? window : globalThis);
