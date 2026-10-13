'use strict';

/*
 * Prova lo schema del cloud (supabase/schema.sql) su un PostgreSQL vero,
 * avviato in una cartella temporanea. Supabase aggiunge lo schema auth e i
 * ruoli anon/authenticated: qui li imitiamo con il minimo indispensabile.
 * Se PostgreSQL non è installato il test viene saltato.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function trovaBin() {
  const base = '/usr/lib/postgresql';
  if (!fs.existsSync(base)) return null;
  const versioni = fs.readdirSync(base).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  for (const v of versioni) {
    const bin = path.join(base, v, 'bin');
    if (fs.existsSync(path.join(bin, 'initdb'))) return bin;
  }
  return null;
}

const BIN = trovaBin();
const comeRoot = typeof process.getuid === 'function' && process.getuid() === 0;

function esegui(cmd, args, opzioni) {
  const comando = comeRoot ? 'runuser' : path.join(BIN, cmd);
  const argomenti = comeRoot ? ['-u', 'postgres', '--', path.join(BIN, cmd)].concat(args) : args;
  return execFileSync(comando, argomenti, Object.assign({ encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }, opzioni));
}

const U1 = '11111111-1111-1111-1111-111111111111';
const U2 = '22222222-2222-2222-2222-222222222222';
const U3 = '33333333-3333-3333-3333-333333333333';

test('schema del cloud su PostgreSQL', { skip: BIN ? false : 'PostgreSQL non installato' }, async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'br-pg-'));
  const dati = path.join(dir, 'dati');
  if (comeRoot) execFileSync('chown', ['postgres', dir]);
  esegui('initdb', ['-D', dati, '-U', 'postgres', '--auth=trust', '-E', 'UTF8', '--no-sync']);
  const porta = String(40000 + Math.floor(Math.random() * 20000));
  esegui('pg_ctl', ['-D', dati, '-l', path.join(dir, 'log'), '-w', '-o',
    `-k ${dir} -p ${porta} -c listen_addresses= -c fsync=off`, 'start']);
  t.after(() => {
    try { esegui('pg_ctl', ['-D', dati, '-m', 'immediate', '-w', 'stop']); } catch (e) { /* già fermo */ }
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const psql = (sql) => esegui('psql', ['-h', dir, '-p', porta, '-U', 'postgres', '-d', 'postgres',
    '-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-f', '-'], { input: sql }).trim();

  psql(`
    create role anon nologin; create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    grant usage on schema public to anon, authenticated;
    insert into auth.users values ('${U1}', 'a@x.it'), ('${U2}', 'b@x.it'), ('${U3}', 'c@x.it');
  `);
  const schema = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'schema.sql'), 'utf8');
  psql(schema);
  psql(schema); // rieseguirlo è innocuo
  psql(`
    insert into studi values ('s1', 'Studio uno'), ('s2', 'Studio due');
    insert into membri (utente, studio_id, operatore_id, ruolo) values
      ('${U1}', 's1', 'op_andrea', 'supervisore'), ('${U2}', 's1', 'op_giulia', 'terapista'), ('${U3}', 's2', 'op_altro', 'terapista');
  `);

  const come = (utente, sql) => psql(`set role authenticated; set request.jwt.claim.sub = '${utente}';\n${sql}`);
  const json = (utente, sql) => JSON.parse(come(utente, sql));

  await t.test('profilo dell’utente collegato', () => {
    assert.deepEqual(json(U2, 'select br_profilo();'),
      { studio: 's1', studioNome: 'Studio uno', operatore: 'op_giulia', ruolo: 'terapista' });
  });

  await t.test('invio: documenti nuovi ed eventi accettati una sola volta', () => {
    const invio = `select br_invia('[{"id":"sog_1","tipo":"soggetto","dati":{"codice":"PZ-1"},"base":null}]'::jsonb,
      '[{"id":"ev_1","sessioneId":"se_1","tipo":"occorrenza","t":1},{"id":"ev_2","sessioneId":"se_1","tipo":"occorrenza","t":2}]'::jsonb);`;
    const r = json(U1, invio);
    assert.equal(r.eventi, 2);
    assert.deepEqual(r.documenti, [{ id: 'sog_1', esito: 'ok', versione: 1 }]);
    const di = json(U1, invio);
    assert.equal(di.eventi, 0, 'rimandare gli stessi eventi è innocuo');
    assert.equal(di.documenti[0].esito, 'conflitto', 'un documento nuovo con id già presente è un conflitto');
    assert.deepEqual(di.documenti[0].dati, { codice: 'PZ-1' });
  });

  await t.test('modifica con versione: chi parte da una versione vecchia va in conflitto', () => {
    const ok = json(U2, `select br_invia('[{"id":"sog_1","tipo":"soggetto","dati":{"codice":"PZ-1b"},"base":1}]'::jsonb);`);
    assert.deepEqual(ok.documenti, [{ id: 'sog_1', esito: 'ok', versione: 2 }]);
    const ko = json(U1, `select br_invia('[{"id":"sog_1","tipo":"soggetto","dati":{"codice":"PZ-1c"},"base":1}]'::jsonb);`);
    assert.equal(ko.documenti[0].esito, 'conflitto');
    assert.equal(ko.documenti[0].versione, 2);
    assert.deepEqual(ko.documenti[0].dati, { codice: 'PZ-1b' });
  });

  await t.test('cambi in ordine dopo il cursore, con l’ora del server', () => {
    const tutto = json(U2, 'select br_cambi(0, 0, 500);');
    assert.ok(tutto.ora);
    assert.deepEqual(tutto.documenti.map((d) => [d.id, d.versione]), [['sog_1', 2]]);
    assert.deepEqual(tutto.eventi.map((e) => e.id), ['ev_1', 'ev_2']);
    const dopo = json(U2, `select br_cambi(${tutto.documenti[0].seq}, ${tutto.eventi[0].seq}, 500);`);
    assert.equal(dopo.documenti.length, 0);
    assert.deepEqual(dopo.eventi.map((e) => e.id), ['ev_2']);
  });

  await t.test('un altro studio non vede né tocca i dati', () => {
    const altro = json(U3, 'select br_cambi(0, 0, 500);');
    assert.equal(altro.documenti.length, 0);
    assert.equal(altro.eventi.length, 0);
    assert.equal(come(U3, 'select count(*) from documenti;'), '0');
    // Stesso id in un altro studio: è un documento diverso, non un conflitto.
    const r = json(U3, `select br_invia('[{"id":"sog_1","tipo":"soggetto","dati":{"codice":"X"},"base":null}]'::jsonb);`);
    assert.equal(r.documenti[0].esito, 'ok');
    assert.equal(come(U1, `select dati->>'codice' from documenti where id = 'sog_1';`), 'PZ-1b');
  });

  await t.test('gli eventi non si modificano né si cancellano', () => {
    assert.throws(() => come(U1, `update eventi set dati = '{}'::jsonb where id = 'ev_1';`), /permission denied/);
    assert.throws(() => come(U1, `delete from eventi where id = 'ev_1';`), /permission denied/);
    assert.throws(() => come(U1, `delete from documenti where id = 'sog_1';`), /permission denied/);
  });

  await t.test('la versione sale di uno alla volta e il server timbra seq e autore', () => {
    assert.throws(() => come(U1, `update documenti set versione = 9 where id = 'sog_1';`), /versione attesa 3/);
    const r = come(U1, `update documenti set dati = '{"codice":"PZ-1d"}', versione = versione + 1, seq = 1, autore = null where id = 'sog_1' returning versione, seq > 10, autore;`);
    assert.equal(r, `3|t|${U1}`);
  });

  await t.test('senza accesso non si legge nulla', () => {
    assert.throws(() => psql(`set role anon; select br_cambi(0, 0, 10);`), /permission denied/);
    assert.throws(() => psql(`set role anon; select * from documenti;`), /permission denied/);
    const nessuno = psql(`set role authenticated; set request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444'; select br_profilo();`);
    assert.equal(nessuno, '');
    assert.throws(() => psql(`set role authenticated; set request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444'; select br_invia();`), /non associato/);
  });

  await t.test('il motore di sincronizzazione dell’app funziona con lo schema vero', async () => {
    require('../app/js/modello.js');
    require('../app/js/piano.js');
    const datiFinti = require('../app/js/dati-finti.js');
    const archivio = require('../app/js/archivio.js');
    const S = require('../app/js/sincronizzazione.js');
    const trasporto = (utente) => ({
      async rpc(nome, a) {
        const args = Object.keys(a).map((k) => `${k} => ` + (typeof a[k] === 'number' ? a[k] : `$j$${JSON.stringify(a[k])}$j$::jsonb`));
        const out = come(utente, `select ${nome}(${args.join(', ')});`);
        return out ? JSON.parse(out) : null;
      }
    });
    psql(`insert into studi values ('s3', 'Studio tre');
      insert into membri (utente, studio_id, operatore_id) values ('${U3}', 's3', 'op_giulia')
      on conflict (utente) do update set studio_id = excluded.studio_id, operatore_id = excluded.operatore_id;
      insert into auth.users values ('${U1.replace(/1/g, '5')}', 'd@x.it');
      insert into membri (utente, studio_id, operatore_id) values ('${U1.replace(/1/g, '5')}', 's3', 'op_andrea');`);
    const U5 = U1.replace(/1/g, '5');

    const desktop = datiFinti.genera(Date.UTC(2026, 9, 13, 8));
    const r1 = await S.ciclo(desktop, trasporto(U5));
    assert.equal(r1.primo, true);
    assert.equal(come(U5, 'select count(*) from eventi;'), String(desktop.eventi.length));

    const telefono = datiFinti.genera(Date.UTC(2026, 9, 12, 8));
    await S.ciclo(telefono, trasporto(U3));
    assert.deepEqual(telefono.config.soggetti, desktop.config.soggetti);
    assert.equal(telefono.operatoreCorrente, 'op_giulia');

    const sog = telefono.config.soggetti[0];
    const tg = archivio.targetDi(sog)[0].target;
    const sess = archivio.apriSessione(telefono, sog);
    archivio.registra(telefono, sess, tg, 'occorrenza');
    archivio.chiudiSessione(telefono, sess);
    const r2 = await S.ciclo(telefono, trasporto(U3));
    assert.equal(r2.inviati, 1);
    assert.equal(sess.sincronizzata, true);

    const r3 = await S.ciclo(desktop, trasporto(U5));
    assert.ok(r3.ricevuti >= 2);
    assert.equal(desktop.sessioni.find((s) => s.id === sess.id).sincronizzata, true);
    assert.deepEqual(S.daInviare(desktop), { documenti: [], eventi: [] });
  });
});
