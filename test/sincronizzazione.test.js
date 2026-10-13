'use strict';

/*
 * Motore di sincronizzazione contro un server finto in memoria che imita le
 * funzioni br_profilo, br_cambi e br_invia di supabase/schema.sql (lo schema
 * vero è provato in schema.test.js).
 */

const test = require('node:test');
const assert = require('node:assert/strict');

require('../app/js/modello.js');
require('../app/js/piano.js');
const datiFinti = require('../app/js/dati-finti.js');
const archivio = require('../app/js/archivio.js');
const S = require('../app/js/sincronizzazione.js');

const copia = (x) => JSON.parse(JSON.stringify(x));

function serverFinto() {
  const srv = { seq: 0, ora: Date.UTC(2026, 9, 13, 10), documenti: new Map(), eventi: new Map(), chiamate: [] };
  const timbro = () => new Date(srv.ora).toISOString();
  srv.trasporto = (profilo) => ({
    async rpc(nome, a) {
      srv.chiamate.push(nome);
      if (nome === 'br_profilo') return copia(profilo);
      if (nome === 'br_cambi') {
        const dopo = (m, c) => [...m.values()].filter((r) => r.seq > c).sort((x, y) => x.seq - y.seq).slice(0, a.limite);
        return copia({
          ora: timbro(),
          documenti: dopo(srv.documenti, a.dopo_documenti),
          eventi: dopo(srv.eventi, a.dopo_eventi)
        });
      }
      if (nome === 'br_invia') {
        let n = 0;
        for (const e of a.eventi) {
          if (srv.eventi.has(e.id)) continue;
          srv.eventi.set(e.id, { id: e.id, dati: copia(e), seq: ++srv.seq, aggiornato: timbro() });
          n++;
        }
        const esiti = a.documenti.map((d) => {
          const c = srv.documenti.get(d.id);
          if ((d.base == null && !c) || (c && d.base === c.versione)) {
            const versione = c ? c.versione + 1 : 1;
            srv.documenti.set(d.id, { id: d.id, tipo: d.tipo, dati: copia(d.dati), versione, seq: ++srv.seq, aggiornato: timbro() });
            return { id: d.id, esito: 'ok', versione };
          }
          return { id: d.id, esito: 'conflitto', versione: c.versione, tipo: c.tipo, dati: copia(c.dati) };
        });
        return { eventi: n, documenti: esiti };
      }
      throw new Error('rpc sconosciuta ' + nome);
    }
  });
  srv.passa = (ms) => { srv.ora += ms; };
  return srv;
}

const PROFILO_A = { studio: 's1', studioNome: 'Studio', operatore: 'op_andrea', ruolo: 'supervisore' };
const PROFILO_B = { studio: 's1', studioNome: 'Studio', operatore: 'op_giulia', ruolo: 'terapista' };

function dispositivo(giorno) {
  return datiFinti.genera(Date.UTC(2026, 9, giorno, 8));
}

test('primo collegamento a un cloud vuoto: il dispositivo vi carica i suoi dati', async () => {
  const srv = serverFinto();
  const a = dispositivo(13);
  const r = await S.ciclo(a, srv.trasporto(PROFILO_A));
  assert.equal(r.primo, true);
  const attesi = a.config.soggetti.length + a.config.operatori.length + a.sessioni.length;
  assert.equal(srv.documenti.size, attesi);
  assert.equal(srv.eventi.size, a.eventi.length);
  assert.ok(a.eventi.every((e) => e.sincronizzato));
  assert.ok(a.sessioni.every((s) => s.sincronizzata));
  assert.deepEqual(S.daInviare(a), { documenti: [], eventi: [] }, 'dopo il ciclo non resta nulla da inviare');
  assert.ok(!('sincronizzata' in srv.documenti.get(a.sessioni[0].id).dati), 'i campi locali non vanno al server');
  assert.ok(!('sincronizzato' in srv.eventi.get(a.eventi[0].id).dati));
});

test('secondo dispositivo: adotta il cloud e non rimanda i suoi dati di esempio', async () => {
  const srv = serverFinto();
  const a = dispositivo(13);
  await S.ciclo(a, srv.trasporto(PROFILO_A));
  const docPrima = srv.documenti.size, evPrima = srv.eventi.size;
  srv.passa(60000);

  const b = dispositivo(10); // esempi generati un altro giorno: date diverse, stessi id
  const r = await S.ciclo(b, srv.trasporto(PROFILO_B));
  assert.equal(r.primo, true);
  assert.equal(r.conflitti, 0);
  assert.equal(srv.documenti.size, docPrima);
  assert.equal(srv.eventi.size, evPrima);
  assert.deepEqual(b.config.soggetti, a.config.soggetti);
  assert.equal(b.sessioni.length, a.sessioni.length);
  assert.equal(b.eventi.length, a.eventi.length);
  assert.equal(b.operatoreCorrente, 'op_giulia', 'l’operatore è quello dell’account');
  assert.deepEqual(S.daInviare(b), { documenti: [], eventi: [] });
});

test('seduta registrata offline sul telefono arriva al desktop', async () => {
  const srv = serverFinto();
  const desktop = dispositivo(13);
  await S.ciclo(desktop, srv.trasporto(PROFILO_A));
  srv.passa(60000);
  const telefono = dispositivo(13);
  await S.ciclo(telefono, srv.trasporto(PROFILO_B));

  // Offline: si registra senza chiamare il server.
  const sog = telefono.config.soggetti[0];
  const t = archivio.targetDi(sog)[0].target;
  const sess = archivio.apriSessione(telefono, sog);
  archivio.registra(telefono, sess, t, 'occorrenza');
  const sbagliato = archivio.registra(telefono, sess, t, 'occorrenza');
  archivio.annullaUltimo(telefono, sess, t);
  archivio.chiudiSessione(telefono, sess);
  const pronti = S.daInviare(telefono);
  assert.equal(pronti.eventi.length, 3);
  assert.deepEqual(pronti.documenti.map((d) => [d.tipo, d.base]), [['sessione', null]]);

  // Torna la rete.
  srv.passa(60000);
  const r = await S.ciclo(telefono, srv.trasporto(PROFILO_B));
  assert.equal(r.inviati, 3);
  assert.equal(sess.sincronizzata, true);

  srv.passa(60000);
  const rd = await S.ciclo(desktop, srv.trasporto(PROFILO_A));
  assert.equal(rd.ricevuti, 4); // la sessione e tre eventi
  const arrivata = desktop.sessioni.find((s) => s.id === sess.id);
  assert.equal(arrivata.stato, 'chiusa');
  assert.equal(arrivata.sincronizzata, true);
  const sogD = desktop.config.soggetti[0];
  const prD = archivio.targetDi(sogD)[0].programma;
  const punti = archivio.serie(desktop, sogD, prD, archivio.targetDi(sogD)[0].target, { soloSincronizzate: true });
  const ultimo = punti.find((p) => p.sessione.id === sess.id);
  assert.ok(ultimo, 'la seduta compare nella serie del desktop');
  assert.ok(desktop.eventi.some((e) => e.rif === sbagliato.id), 'arriva anche la correzione');
  assert.deepEqual(S.daInviare(desktop), { documenti: [], eventi: [] }, 'il desktop non rimanda ciò che ha ricevuto');
});

test('due modifiche alla stessa configurazione: vince la prima, l’altra resta tra i conflitti', async () => {
  const srv = serverFinto();
  const a = dispositivo(13);
  await S.ciclo(a, srv.trasporto(PROFILO_A));
  srv.passa(60000);
  const b = dispositivo(13);
  await S.ciclo(b, srv.trasporto(PROFILO_B));

  a.config.soggetti[0].note = 'Nota dal desktop di Andrea';
  b.config.soggetti[0].note = 'Nota dal portatile di Giulia';
  srv.passa(60000);
  await S.ciclo(a, srv.trasporto(PROFILO_A));
  srv.passa(60000);
  await S.ciclo(b, srv.trasporto(PROFILO_B));

  assert.equal(b.config.soggetti[0].note, 'Nota dal desktop di Andrea');
  assert.equal(b.sync.conflitti.length, 1);
  assert.equal(b.sync.conflitti[0].copiaLocale.note, 'Nota dal portatile di Giulia');
  assert.equal(srv.documenti.get(a.config.soggetti[0].id).versione, 2);
  assert.deepEqual(S.daInviare(b), { documenti: [], eventi: [] });
});

test('conflitto scoperto all’invio: il server risponde con la sua versione', async () => {
  const srv = serverFinto();
  const a = dispositivo(13);
  await S.ciclo(a, srv.trasporto(PROFILO_A));
  const id = a.config.soggetti[1].id;
  // Qualcun altro modifica il documento sul server senza che A lo sappia.
  const riga = srv.documenti.get(id);
  srv.documenti.set(id, Object.assign({}, riga, { versione: 2, seq: ++srv.seq, dati: Object.assign({}, riga.dati, { note: 'dal server' }) }));
  a.config.soggetti[1].note = 'da A';
  const pronti = S.daInviare(a);
  const lotto = { documenti: pronti.documenti, eventi: [] };
  const risposta = await srv.trasporto(PROFILO_A).rpc('br_invia', { documenti: pronti.documenti, eventi: [] });
  const esito = S.applicaEsiti(a, lotto, risposta);
  assert.equal(esito.conflitti, 1);
  assert.equal(a.config.soggetti[1].note, 'dal server');
  assert.equal(a.sync.conflitti[0].copiaLocale.note, 'da A');
});

test('le righe recenti si rileggono al giro dopo senza duplicarsi', async () => {
  const srv = serverFinto();
  const a = dispositivo(13);
  await S.ciclo(a, srv.trasporto(PROFILO_A));
  // Subito dopo l'invio le righe sono più recenti del margine: il cursore resta fermo.
  assert.equal(a.sync.cursori.eventi, 0);
  const n = a.eventi.length;
  await S.ciclo(a, srv.trasporto(PROFILO_A));
  assert.equal(a.eventi.length, n);
  srv.passa(S.MARGINE_MS + 1000);
  await S.ciclo(a, srv.trasporto(PROFILO_A));
  assert.equal(a.sync.cursori.eventi, Math.max(...[...srv.eventi.values()].map((e) => e.seq)));
});

test('cursore: si ferma alla prima riga troppo recente', () => {
  const ora = '2026-10-13T10:00:00.000Z';
  const vecchia = '2026-10-13T09:58:00.000Z', nuova = '2026-10-13T09:59:50.000Z';
  assert.deepEqual(S.avanzaCursore(0, [{ seq: 1, aggiornato: vecchia }, { seq: 2, aggiornato: nuova }, { seq: 3, aggiornato: vecchia }], ora), { cursore: 1, fermo: true });
  assert.deepEqual(S.avanzaCursore(5, [{ seq: 6, aggiornato: vecchia }], ora), { cursore: 6, fermo: false });
});

test('primo collegamento a un cloud con dati: tiene le sedute vere registrate in locale', async () => {
  const srv = serverFinto();
  const a = dispositivo(13);
  await S.ciclo(a, srv.trasporto(PROFILO_A));
  srv.passa(60000);

  // B ha lavorato in modalità locale: la sincronizzazione simulata ha marcato
  // tutto come inviato, ma il cloud non l'ha mai visto.
  const b = dispositivo(13);
  const sog = b.config.soggetti[0];
  const t = archivio.targetDi(sog)[0].target;
  const sess = archivio.apriSessione(b, sog);
  const ev = archivio.registra(b, sess, t, 'occorrenza');
  archivio.chiudiSessione(b, sess);
  archivio.sincronizza(b);
  assert.equal(ev.sincronizzato, true);

  await S.ciclo(b, srv.trasporto(PROFILO_B));
  assert.ok(srv.eventi.has(ev.id), 'l’evento registrato in locale arriva al cloud');
  assert.ok(srv.documenti.has(sess.id), 'anche la sua sessione');
  assert.ok(b.eventi.some((e) => e.id === ev.id));
});

test('cambio di studio: si riparte da zero ma i conflitti restano', async () => {
  const srv = serverFinto();
  const a = dispositivo(13);
  await S.ciclo(a, srv.trasporto(PROFILO_A));
  a.sync.conflitti.push({ id: 'x', tipo: 'soggetto', copiaLocale: {} });
  const altro = serverFinto();
  await S.ciclo(a, altro.trasporto({ studio: 's2', studioNome: 'Altro', operatore: 'op_andrea' }));
  assert.equal(a.sync.studio, 's2');
  assert.equal(a.sync.conflitti.length, 1);
});

test('account senza studio: errore chiaro, nessun dato toccato', async () => {
  const srv = serverFinto();
  const a = dispositivo(13);
  const prima = JSON.stringify(a);
  await assert.rejects(S.ciclo(a, srv.trasporto(null)), (e) => e.codice === 'senza-studio');
  assert.equal(JSON.stringify(Object.assign({}, a, { sync: undefined })), JSON.stringify(Object.assign(JSON.parse(prima), { sync: undefined })));
});

test('id dei dati di esempio riconosciuti', () => {
  assert.equal(S.diEsempio('sog_00001'), true);
  assert.equal(S.diEsempio('ev_123e4567-e89b-12d3-a456-426614174000'), false);
});

// ---- Trasporto Supabase con fetch finto --------------------------------------

function fetchFinto(gestore) {
  const chiamate = [];
  const f = async (url, init) => {
    const corpo = init.body ? JSON.parse(init.body) : null;
    chiamate.push({ url, headers: init.headers, corpo });
    const [stato, json] = gestore(url, init.headers, corpo, chiamate.length);
    return { ok: stato >= 200 && stato < 300, status: stato, text: async () => (json == null ? '' : JSON.stringify(json)) };
  };
  f.chiamate = chiamate;
  return f;
}

test('supabase: accesso, chiamate con token e rinnovo dopo un 401', async () => {
  let token = 'tok1';
  let salvata = null;
  const f = fetchFinto((url, h, corpo) => {
    if (url.endsWith('grant_type=password')) {
      if (corpo.password !== 'giusta') return [400, { error: 'invalid_grant', error_description: 'Invalid login credentials' }];
      return [200, { access_token: 'tok1', refresh_token: 'r1', expires_in: 3600, user: { id: 'u1', email: corpo.email } }];
    }
    if (url.endsWith('grant_type=refresh_token')) {
      assert.equal(corpo.refresh_token, 'r1');
      token = 'tok2';
      return [200, { access_token: 'tok2', refresh_token: 'r2', expires_in: 3600 }];
    }
    if (url.includes('/rest/v1/rpc/br_profilo')) {
      if (h.Authorization !== 'Bearer ' + token) return [401, { message: 'JWT expired' }];
      return [200, { studio: 's1' }];
    }
    return [404, null];
  });
  const sb = S.supabase({ url: 'https://abc.supabase.co/', chiave: 'anon', fetch: f, salvaSessione: (s) => { salvata = s; } });

  await assert.rejects(sb.accedi('a@x.it', 'sbagliata'), (e) => e.codice === 'credenziali' && /non corrette/.test(e.message));
  await sb.accedi('a@x.it', 'giusta');
  assert.equal(salvata.utente.email, 'a@x.it');
  assert.equal(f.chiamate[1].url, 'https://abc.supabase.co/auth/v1/token?grant_type=password');
  assert.equal(f.chiamate[1].headers.apikey, 'anon');

  assert.deepEqual(await sb.rpc('br_profilo', {}), { studio: 's1' });
  // Il server rifiuta tok1: il trasporto rinnova e riprova una volta.
  token = 'tok2';
  assert.deepEqual(await sb.rpc('br_profilo', {}), { studio: 's1' });
  assert.equal(salvata.accesso, 'tok2');
  assert.equal(salvata.utente.email, 'a@x.it', 'il rinnovo conserva l’utente');

  await sb.esci();
  assert.equal(salvata, null);
  await assert.rejects(sb.rpc('br_profilo', {}), (e) => e.codice === 'accesso');
});

test('supabase: rete assente e rinnovo rifiutato', async () => {
  const offline = S.supabase({ url: 'https://x', chiave: 'k', sessione: { accesso: 'a', rinnovo: 'r', scade: Date.now() + 1e6 }, fetch: async () => { throw new TypeError('Failed to fetch'); } });
  await assert.rejects(offline.rpc('br_profilo', {}), (e) => e.codice === 'rete');

  let salvata = 'non toccata';
  const scaduta = S.supabase({
    url: 'https://x', chiave: 'k', sessione: { accesso: 'a', rinnovo: 'r', scade: 0 },
    salvaSessione: (s) => { salvata = s; },
    fetch: fetchFinto(() => [400, { error: 'invalid_grant' }])
  });
  await assert.rejects(scaduta.rpc('br_profilo', {}), (e) => e.codice === 'accesso');
  assert.equal(salvata, null);
});
