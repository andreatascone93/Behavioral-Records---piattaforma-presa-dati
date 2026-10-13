/*
 * Sincronizzazione con il cloud (Supabase). Il dispositivo lavora sempre
 * sulla sua copia locale; un ciclo di sincronizzazione riceve ciò che è
 * cambiato sul server e poi invia ciò che è cambiato qui.
 *
 * - Eventi: immutabili, il server li accetta una sola volta per id.
 * - Documenti (soggetto con la sua configurazione, sessione, operatore): hanno
 *   una versione. Si invia "parto dalla versione N"; se il server ne ha
 *   un'altra, vince il server e la copia locale finisce tra i conflitti.
 *
 * Il motore non sa nulla del browser: riceve lo stato e un "trasporto" con
 * rpc(nome, argomenti). supabase() è il trasporto vero; i test ne usano uno
 * in memoria. Vedi docs/decisione-tecnologica.md e supabase/schema.sql.
 */
(function (root) {
  'use strict';

  var MARGINE_MS = 30000; // righe più recenti di così si rileggono al giro dopo
  var LIMITE = 500;       // righe per pagina in ricezione
  var LOTTO_EVENTI = 500;
  var LOTTO_DOCUMENTI = 50;

  // ---- Stato della sincronizzazione ------------------------------------------

  function nuovoStatoSync() {
    return { studio: null, cursori: { documenti: 0, eventi: 0 }, base: {}, conflitti: [], ultima: null, errore: null };
  }

  function statoSync(stato) {
    if (!stato.sync) stato.sync = nuovoStatoSync();
    return stato.sync;
  }

  // Impronta veloce (cyrb53) del contenuto di un documento: dice se è
  // cambiato dall'ultima versione scambiata con il server.
  function impronta(valore) {
    var s = JSON.stringify(valore);
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 2654435761);
      h2 = Math.imul(h2 ^ c, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }

  // Campi che valgono solo su questo dispositivo e non vanno al server.
  var LOCALI = { sessione: ['sincronizzata'], evento: ['sincronizzato'] };

  function pulisci(tipo, x) {
    var fuori = LOCALI[tipo];
    if (!fuori) return x;
    var out = {};
    Object.keys(x).forEach(function (k) { if (fuori.indexOf(k) === -1) out[k] = x[k]; });
    return out;
  }

  // I dati di esempio hanno id deterministici (sog_00001); quelli veri hanno
  // un UUID. Serve al primo collegamento per non mandare esempi in un cloud
  // che contiene già dati veri.
  function diEsempio(id) { return /^[a-z]+_\d{5}$/.test(id); }

  // ---- Documenti dello stato locale --------------------------------------------

  var RACCOLTE = {
    soggetto: function (stato) { return stato.config.soggetti; },
    operatore: function (stato) { return stato.config.operatori; },
    protocollo: function (stato) { return stato.config.protocolli || (stato.config.protocolli = []); },
    sessione: function (stato) { return stato.sessioni; }
  };

  function documentiLocali(stato) {
    var out = [];
    Object.keys(RACCOLTE).forEach(function (tipo) {
      RACCOLTE[tipo](stato).forEach(function (x) { out.push({ id: x.id, tipo: tipo, ogg: x }); });
    });
    return out;
  }

  function trovaLocale(stato, tipo, id) {
    var lista = RACCOLTE[tipo] ? RACCOLTE[tipo](stato) : [];
    for (var i = 0; i < lista.length; i++) if (lista[i].id === id) return { lista: lista, indice: i, ogg: lista[i] };
    return null;
  }

  function daServer(tipo, dati) {
    var x = JSON.parse(JSON.stringify(dati));
    if (tipo === 'sessione') x.sincronizzata = x.stato === 'chiusa';
    return x;
  }

  function sostituisci(stato, tipo, dati) {
    if (!RACCOLTE[tipo]) return;
    var x = daServer(tipo, dati);
    var l = trovaLocale(stato, tipo, dati.id);
    if (l) l.lista[l.indice] = x;
    else RACCOLTE[tipo](stato).push(x);
  }

  function modificato(sy, tipo, ogg) {
    var b = sy.base[ogg.id];
    return !b || b.impronta !== impronta(pulisci(tipo, ogg));
  }

  function registraConflitto(sy, tipo, locale, versioneServer) {
    sy.conflitti.push({
      id: locale.id, tipo: tipo, quando: Date.now(), versioneServer: versioneServer,
      copiaLocale: pulisci(tipo, JSON.parse(JSON.stringify(locale)))
    });
  }

  // ---- Invio -------------------------------------------------------------------

  // Documenti cambiati dall'ultima volta ed eventi non ancora confermati.
  function daInviare(stato) {
    var sy = statoSync(stato);
    var documenti = [];
    documentiLocali(stato).forEach(function (d) {
      var dati = pulisci(d.tipo, d.ogg);
      var imp = impronta(dati);
      var b = sy.base[d.id];
      if (b && b.impronta === imp) return;
      documenti.push({ id: d.id, tipo: d.tipo, dati: dati, base: b ? b.versione : null, impronta: imp });
    });
    var eventi = stato.eventi.filter(function (e) { return !e.sincronizzato; }).map(function (e) { return pulisci('evento', e); });
    return { documenti: documenti, eventi: eventi };
  }

  function applicaEsiti(stato, inviati, risposta) {
    var sy = statoSync(stato);
    var esito = { eventi: 0, documenti: 0, conflitti: 0 };
    if (inviati.eventi.length) {
      var ids = {};
      inviati.eventi.forEach(function (e) { ids[e.id] = true; });
      stato.eventi.forEach(function (e) { if (ids[e.id] && !e.sincronizzato) { e.sincronizzato = true; esito.eventi++; } });
    }
    var perId = {};
    inviati.documenti.forEach(function (d) { perId[d.id] = d; });
    ((risposta && risposta.documenti) || []).forEach(function (r) {
      var d = perId[r.id];
      if (!d) return;
      if (r.esito === 'ok') {
        sy.base[d.id] = { versione: r.versione, impronta: d.impronta };
        if (d.tipo === 'sessione') {
          var s = trovaLocale(stato, 'sessione', d.id);
          // Il dato inviato è quello attuale solo se nel frattempo non è cambiato.
          if (s && s.ogg.stato === 'chiusa' && impronta(pulisci('sessione', s.ogg)) === d.impronta) s.ogg.sincronizzata = true;
        }
        esito.documenti++;
      } else if (r.esito === 'conflitto' && r.dati) {
        var locale = trovaLocale(stato, d.tipo, d.id);
        if (locale) registraConflitto(sy, d.tipo, locale.ogg, r.versione);
        sostituisci(stato, r.tipo || d.tipo, r.dati);
        sy.base[d.id] = { versione: r.versione, impronta: impronta(pulisci(r.tipo || d.tipo, r.dati)) };
        esito.conflitti++;
      }
    });
    return esito;
  }

  // ---- Ricezione ---------------------------------------------------------------

  // Applica una pagina di cambi del server. Restituisce quanti dati sono
  // cambiati sul dispositivo.
  function applicaCambi(stato, pagina) {
    var sy = statoSync(stato);
    var cambiati = 0;
    (pagina.documenti || []).forEach(function (r) {
      var b = sy.base[r.id];
      if (b && b.versione >= r.versione) return; // già visto
      var locale = trovaLocale(stato, r.tipo, r.id);
      if (locale && b && modificato(sy, r.tipo, locale.ogg)) registraConflitto(sy, r.tipo, locale.ogg, r.versione);
      sostituisci(stato, r.tipo, r.dati);
      sy.base[r.id] = { versione: r.versione, impronta: impronta(pulisci(r.tipo, r.dati)) };
      cambiati++;
    });
    var nuovi = aggiungiEventi(stato, pagina.eventi || []);
    return cambiati + nuovi;
  }

  function aggiungiEventi(stato, righe) {
    if (!righe.length) return 0;
    var presenti = {};
    stato.eventi.forEach(function (e) { presenti[e.id] = e; });
    var nuovi = 0;
    righe.forEach(function (r) {
      var e = presenti[r.id];
      if (e) { e.sincronizzato = true; return; }
      var x = JSON.parse(JSON.stringify(r.dati));
      x.sincronizzato = true;
      stato.eventi.push(x);
      presenti[x.id] = x;
      nuovi++;
    });
    if (nuovi) stato.eventi.sort(function (a, b) { return a.t - b.t; });
    return nuovi;
  }

  // Il cursore avanza solo sulle righe abbastanza vecchie: una transazione
  // lenta potrebbe ancora rendere visibile una riga con un numero più basso.
  function avanzaCursore(attuale, righe, ora) {
    var limite = Date.parse(ora) - MARGINE_MS;
    var c = attuale;
    for (var i = 0; i < righe.length; i++) {
      if (!(Date.parse(righe[i].aggiornato) <= limite)) return { cursore: c, fermo: true };
      c = righe[i].seq;
    }
    return { cursore: c, fermo: false };
  }

  // Scarica tutte le pagine dopo i cursori salvati. onPagina riceve ogni pagina.
  async function ricevi(trasporto, sy, onPagina) {
    var letti = { documenti: sy.cursori.documenti, eventi: sy.cursori.eventi };
    var sicuri = { documenti: sy.cursori.documenti, eventi: sy.cursori.eventi };
    var fermi = { documenti: false, eventi: false };
    for (var giri = 0; giri < 10000; giri++) {
      var p = await trasporto.rpc('br_cambi', { dopo_documenti: letti.documenti, dopo_eventi: letti.eventi, limite: LIMITE });
      onPagina(p);
      ['documenti', 'eventi'].forEach(function (k) {
        var righe = p[k] || [];
        if (!righe.length) return;
        letti[k] = righe[righe.length - 1].seq;
        if (!fermi[k]) {
          var a = avanzaCursore(sicuri[k], righe, p.ora);
          sicuri[k] = a.cursore;
          fermi[k] = a.fermo;
        }
      });
      if ((p.documenti || []).length < LIMITE && (p.eventi || []).length < LIMITE) break;
    }
    return sicuri;
  }

  // ---- Primo collegamento a uno studio ----------------------------------------

  // Se il cloud ha già dati, il dispositivo li adotta e tiene solo ciò che ha
  // registrato di suo (mai i dati di esempio). Se il cloud è vuoto, tutto ciò
  // che c'è sul dispositivo verrà inviato.
  function adotta(stato, righe) {
    var sy = statoSync(stato);
    var server = {};
    righe.documenti.forEach(function (r) { server[r.id] = r; });
    var eventiServer = {};
    righe.eventi.forEach(function (r) { eventiServer[r.id] = true; });

    if (!righe.documenti.length) {
      stato.eventi.forEach(function (e) { e.sincronizzato = false; });
      stato.sessioni.forEach(function (s) { s.sincronizzata = false; });
      return { adottati: 0 };
    }

    Object.keys(RACCOLTE).forEach(function (tipo) {
      var lista = RACCOLTE[tipo](stato);
      var tenuti = lista.filter(function (x) { return !server[x.id] && !diEsempio(x.id); });
      tenuti.forEach(function (x) { if (tipo === 'sessione') x.sincronizzata = false; });
      lista.length = 0;
      righe.documenti.forEach(function (r) { if (r.tipo === tipo) lista.push(daServer(tipo, r.dati)); });
      tenuti.forEach(function (x) { lista.push(x); });
    });
    righe.documenti.forEach(function (r) {
      sy.base[r.id] = { versione: r.versione, impronta: impronta(pulisci(r.tipo, r.dati)) };
    });

    var propri = stato.eventi.filter(function (e) { return !eventiServer[e.id] && !diEsempio(e.id); });
    propri.forEach(function (e) { e.sincronizzato = false; });
    stato.eventi = righe.eventi.map(function (r) {
      var x = JSON.parse(JSON.stringify(r.dati));
      x.sincronizzato = true;
      return x;
    }).concat(propri).sort(function (a, b) { return a.t - b.t; });
    return { adottati: righe.documenti.length };
  }

  // ---- Ciclo completo ------------------------------------------------------------

  async function ciclo(stato, trasporto) {
    var sy = statoSync(stato);
    var profilo = await trasporto.rpc('br_profilo', {});
    if (!profilo || !profilo.studio) {
      var e = new Error('Questo account non è ancora associato a uno studio.');
      e.codice = 'senza-studio';
      throw e;
    }
    var risultato = { ricevuti: 0, inviati: 0, conflitti: 0, primo: false, profilo: profilo };

    if (sy.studio !== profilo.studio) {
      // Studio nuovo per questo dispositivo: si riparte da zero.
      var conflitti = sy.conflitti;
      stato.sync = sy = nuovoStatoSync();
      sy.conflitti = conflitti;
      var tutto = { documenti: [], eventi: [] };
      var cursori = await ricevi(trasporto, sy, function (p) {
        tutto.documenti = tutto.documenti.concat(p.documenti || []);
        tutto.eventi = tutto.eventi.concat(p.eventi || []);
      });
      adotta(stato, tutto);
      sy.cursori = cursori;
      sy.studio = profilo.studio;
      risultato.primo = true;
      risultato.ricevuti = tutto.documenti.length + tutto.eventi.length;
    } else {
      sy.cursori = await ricevi(trasporto, sy, function (p) { risultato.ricevuti += applicaCambi(stato, p); });
    }
    sy.studioNome = profilo.studioNome;
    stato.operatoreCorrente = profilo.operatore || stato.operatoreCorrente;

    var pronti = daInviare(stato);
    // Prima gli eventi, poi i documenti: una sessione chiusa arriva al
    // desktop dopo i suoi eventi.
    for (var i = 0; i < pronti.eventi.length; i += LOTTO_EVENTI) {
      var lotto = { documenti: [], eventi: pronti.eventi.slice(i, i + LOTTO_EVENTI) };
      var r = await trasporto.rpc('br_invia', { documenti: [], eventi: lotto.eventi });
      risultato.inviati += applicaEsiti(stato, lotto, r).eventi;
    }
    for (var j = 0; j < pronti.documenti.length; j += LOTTO_DOCUMENTI) {
      var lottoD = { documenti: pronti.documenti.slice(j, j + LOTTO_DOCUMENTI), eventi: [] };
      var rd = await trasporto.rpc('br_invia', {
        documenti: lottoD.documenti.map(function (d) { return { id: d.id, tipo: d.tipo, dati: d.dati, base: d.base }; }),
        eventi: []
      });
      var es = applicaEsiti(stato, lottoD, rd);
      risultato.conflitti += es.conflitti;
      if (es.conflitti) risultato.ricevuti += es.conflitti;
    }

    sy.ultima = Date.now();
    sy.errore = null;
    stato.rete = stato.rete || {};
    stato.rete.ultimaSincronizzazione = sy.ultima;
    return risultato;
  }

  // ---- Trasporto Supabase ----------------------------------------------------------

  /*
   * opzioni: { url, chiave, sessione, salvaSessione(sessione), fetch }
   * La sessione (token di accesso e di rinnovo) la conserva chi chiama.
   */
  function supabase(opzioni) {
    var o = opzioni || {};
    var base = String(o.url || '').replace(/\/+$/, '');
    var chiave = o.chiave;
    var fetchFn = o.fetch || (root.fetch && root.fetch.bind(root));
    var sessione = o.sessione || null;

    function errore(messaggio, codice, stato) {
      var e = new Error(messaggio);
      e.codice = codice;
      e.stato = stato;
      return e;
    }

    async function chiama(percorso, corpo, token) {
      var risposta;
      try {
        risposta = await fetchFn(base + percorso, {
          method: 'POST',
          headers: { apikey: chiave, Authorization: 'Bearer ' + (token || chiave), 'Content-Type': 'application/json' },
          body: JSON.stringify(corpo || {})
        });
      } catch (e) {
        throw errore('Il cloud non risponde. Controlla la connessione.', 'rete');
      }
      var testo = await risposta.text();
      var json = null;
      try { json = testo ? JSON.parse(testo) : null; } catch (e) { /* risposta non JSON */ }
      if (!risposta.ok) {
        var msg = (json && (json.message || json.msg || json.error_description || json.error)) || ('Errore ' + risposta.status);
        throw errore(msg, risposta.status === 401 ? 'accesso' : 'server', risposta.status);
      }
      return json;
    }

    function imposta(j) {
      sessione = {
        accesso: j.access_token, rinnovo: j.refresh_token,
        scade: Date.now() + (j.expires_in || 3600) * 1000,
        utente: j.user ? { id: j.user.id, email: j.user.email } : (sessione && sessione.utente) || null
      };
      if (o.salvaSessione) o.salvaSessione(sessione);
      return sessione;
    }

    async function accedi(email, password) {
      try {
        return imposta(await chiama('/auth/v1/token?grant_type=password', { email: email, password: password }));
      } catch (e) {
        if (e.stato === 400) throw errore('Email o password non corrette.', 'credenziali', 400);
        throw e;
      }
    }

    async function rinnova() {
      if (!sessione || !sessione.rinnovo) throw errore('Accesso scaduto: entra di nuovo.', 'accesso', 401);
      try {
        return imposta(await chiama('/auth/v1/token?grant_type=refresh_token', { refresh_token: sessione.rinnovo }));
      } catch (e) {
        if (e.codice !== 'rete') {
          sessione = null;
          if (o.salvaSessione) o.salvaSessione(null);
          throw errore('Accesso scaduto: entra di nuovo.', 'accesso', 401);
        }
        throw e;
      }
    }

    async function rpc(nome, argomenti) {
      if (!sessione) throw errore('Non sei collegato al cloud.', 'accesso', 401);
      if (sessione.scade - 60000 < Date.now()) await rinnova();
      try {
        return await chiama('/rest/v1/rpc/' + nome, argomenti, sessione.accesso);
      } catch (e) {
        if (e.stato !== 401) throw e;
        await rinnova();
        return chiama('/rest/v1/rpc/' + nome, argomenti, sessione.accesso);
      }
    }

    async function esci() {
      var s = sessione;
      sessione = null;
      if (o.salvaSessione) o.salvaSessione(null);
      if (s) { try { await chiama('/auth/v1/logout', {}, s.accesso); } catch (e) { /* già uscito */ } }
    }

    return {
      accedi: accedi, rinnova: rinnova, rpc: rpc, esci: esci,
      sessione: function () { return sessione; }
    };
  }

  var api = {
    ciclo: ciclo, daInviare: daInviare, applicaEsiti: applicaEsiti, applicaCambi: applicaCambi,
    adotta: adotta, avanzaCursore: avanzaCursore, impronta: impronta, diEsempio: diEsempio,
    supabase: supabase, statoSync: statoSync, MARGINE_MS: MARGINE_MS, LIMITE: LIMITE
  };
  root.BR = root.BR || {};
  root.BR.sincronizzazione = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
