'use strict';

/*
 * Controlli sui file dell'app installabile: il service worker deve conservare
 * tutti i file che servono senza rete, e le pagine non devono puntare a file
 * che non esistono.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const APP = path.join(__dirname, '..', 'app');

function fileDell(dir, base = '') {
  return fs.readdirSync(path.join(dir, base), { withFileTypes: true }).flatMap((d) => {
    const rel = base ? base + '/' + d.name : d.name;
    return d.isDirectory() ? fileDell(dir, rel) : [rel];
  });
}

const sw = fs.readFileSync(path.join(APP, 'sw.js'), 'utf8');
const elenco = JSON.parse(sw.match(/var FILE = (\[[\s\S]*?\]);/)[1].replace(/'/g, '"'));

test('il service worker conserva tutti i file dell’app, e solo file che esistono', () => {
  const tutti = fileDell(APP).filter((f) => f !== 'sw.js' && f !== '_headers');
  for (const f of tutti) assert.ok(elenco.includes(f), f + ' manca nell’elenco di sw.js');
  for (const f of elenco) if (f !== './') assert.ok(fs.existsSync(path.join(APP, f)), f + ' non esiste');
});

test('le pagine puntano a file esistenti', () => {
  for (const pagina of ['index.html', 'desktop.html', 'mobile.html']) {
    const html = fs.readFileSync(path.join(APP, pagina), 'utf8');
    const rif = [...html.matchAll(/(?:src|href)="([^"#:]+)"/g)].map((m) => m[1]);
    for (const r of rif) assert.ok(fs.existsSync(path.join(APP, r)), pagina + ' → ' + r);
  }
});

test('manifest valido con le icone per l’installazione', () => {
  const m = JSON.parse(fs.readFileSync(path.join(APP, 'manifest.webmanifest'), 'utf8'));
  assert.equal(m.display, 'standalone');
  assert.ok(m.icons.some((i) => i.sizes === '192x192'));
  assert.ok(m.icons.some((i) => i.sizes === '512x512'));
  assert.ok(m.icons.some((i) => i.purpose === 'maskable'));
  for (const i of m.icons) assert.ok(fs.existsSync(path.join(APP, i.src)), i.src);
});

test('le pagine dell’app caricano gli script nell’ordine giusto', () => {
  for (const pagina of ['desktop.html', 'mobile.html']) {
    const html = fs.readFileSync(path.join(APP, pagina), 'utf8');
    const script = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
    const prima = (a, b) => assert.ok(script.indexOf(a) !== -1 && script.indexOf(a) < script.indexOf(b), pagina + ': ' + a + ' prima di ' + b);
    prima('config.js', 'js/cloud.js');
    prima('js/modello.js', 'js/seduta.js');
    prima('js/seduta.js', 'js/dati-finti.js');
    prima('js/seduta.js', 'js/archivio.js');
    prima('js/deposito.js', 'js/archivio.js');
    prima('js/archivio.js', 'js/cloud.js');
    prima('js/sincronizzazione.js', 'js/cloud.js');
    prima('js/ui.js', 'js/cloud-ui.js');
    prima('js/cloud.js', 'js/cloud-ui.js');
  }
});
