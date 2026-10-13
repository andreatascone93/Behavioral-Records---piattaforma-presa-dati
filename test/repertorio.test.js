'use strict';

/*
 * Obiettivi numerici tipo VB-MAPP: elementi dei target, repertorio del
 * soggetto, alternanza tra richieste facili e prove di training, libreria
 * dei protocolli.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const M = require('../app/js/modello.js');
require('../app/js/piano.js');
require('../app/js/fedelta.js');
const datiFinti = require('../app/js/dati-finti.js');
const archivio = require('../app/js/archivio.js');
const R = require('../app/js/repertorio.js');
const PR = require('../app/js/protocolli.js');
const sync = require('../app/js/sincronizzazione.js');

const S = Date.UTC(2026, 9, 12, 9, 0, 0);
let n = 0;
const prova = (sec, prompt, elemento, mantenimento) => {
  const v = prompt === 'errore' ? { esito: 'errore', prompt: null } : { esito: 'corretta', prompt };
  if (elemento) v.elemento = elemento;
  if (mantenimento) v.mantenimento = true;
  return { id: 'e' + ++n, tipo: 'prova', t: S + sec * 1000, valore: v };
};

function targetConElementi() {
  const el = R.nuoviElementi('tact');
  el.obiettivo = 5;
  el.inContemporanea = 2;
  R.aggiungiVoci(el, R.leggiRighe('animali: mucca\nanimali: pecora\ncibi: mela\nscarpa'), 'coda');
  R.promuovi(el, '2026-10-01');
  return { id: 'tg_1', nome: 'Tact', metodo: { id: 'me_1', tipo: 'dtt', versione: 1, parametri: { prove: 10 }, criterio: null }, elementi: el };
}

test('le richieste facili non entrano nella percentuale e i dati si tengono per elemento', () => {
  const ev = [prova(1, 'I', 'a'), prova(2, 'I', 'k1', true), prova(3, 'V', 'b'), prova(4, 'errore', 'k2', true), prova(5, 'I', 'a'), prova(6, 'errore', 'b')];
  const r = M.calcola({ tipo: 'dtt' }, ev, { inizio: S, fine: S + 600000 });
  assert.equal(r.dettagli.prove, 4);
  assert.equal(r.valore, 50);
  assert.equal(r.dettagli.perElemento.a.prove, 2);
  assert.equal(r.dettagli.perElemento.a.distribuzione.I, 2);
  assert.equal(r.dettagli.perElemento.b.distribuzione.errore, 1);
  assert.deepEqual(r.dettagli.mantenimento, { prove: 2, corrette: 1, errori: { k2: 1 } });
  // Senza elementi il calcolo resta quello di prima.
  const semplice = M.calcola({ tipo: 'dtt' }, [prova(1, 'I'), prova(2, 'V')], { inizio: S, fine: S + 60000 });
  assert.equal(semplice.valore, 50);
  assert.equal(semplice.dettagli.perElemento, undefined);
  assert.equal(semplice.dettagli.mantenimento, undefined);
});

test('righe con categoria, virgole conservate e niente doppioni', () => {
  assert.deepEqual(R.leggiRighe('animali: cane\ncane\n\ncanzoni: uno, due, …\npalla', 'giochi'), [
    { testo: 'cane', categoria: 'animali' }, { testo: 'uno, due, …', categoria: 'canzoni' }, { testo: 'palla', categoria: 'giochi' }
  ]);
  const t = targetConElementi();
  assert.equal(R.inInsegnamento(t.elementi).length, 2);
  assert.equal(R.inCoda(t.elementi).length, 2);
  assert.equal(R.aggiungiVoci(t.elementi, [{ testo: 'Mucca' }]).length, 0);
});

test('segnare acquisita una risposta porta in insegnamento la prossima in coda', () => {
  const t = targetConElementi();
  const prima = R.inInsegnamento(t.elementi)[0];
  const r = R.segnaAcquisito(t.elementi, prima.id, '2026-10-10');
  assert.equal(r.voce.stato, 'acquisito');
  assert.equal(r.voce.acquisito, '2026-10-10');
  assert.deepEqual(r.promosse.map((v) => v.testo), ['mela']);
  assert.equal(R.inInsegnamento(t.elementi).length, 2);
});

test('obiettivo numerico: conta il repertorio dell’operante o solo il target', () => {
  const t = targetConElementi();
  const sog = { repertorio: [{ id: 'rp_1', testo: 'cane', operante: 'tact', categoria: 'animali' }, { id: 'rp_2', testo: 'acqua', operante: 'mand' }], programmi: [{ target: [t] }] };
  R.segnaAcquisito(t.elementi, R.inInsegnamento(t.elementi)[0].id);
  let p = R.progresso(sog, t);
  assert.equal(p.acquisiti, 2); // cane (già presente) + mucca
  assert.equal(p.obiettivo, 5);
  assert.equal(p.percentuale, 40);
  assert.match(R.descriviProgresso(p), /^2 di 5 tact acquisiti · 2 in insegnamento, 1 in coda$/);
  t.elementi.conta = 'target';
  p = R.progresso(sog, t);
  assert.equal(p.acquisiti, 1);
  // Lo stesso tact presente e acquisito conta una volta.
  sog.repertorio.push({ id: 'rp_3', testo: 'Mucca', operante: 'tact' });
  t.elementi.conta = 'repertorio';
  assert.equal(R.progresso(sog, t).acquisiti, 2);
  const gruppi = R.perOperante(R.repertorio(sog));
  assert.deepEqual(Object.keys(gruppi), ['mand', 'tact']);
  // Un elenco spento non conta.
  t.elementi.attivo = false;
  assert.equal(R.elementi(t), null);
});

test('alternanza: dopo ogni prova di training una richiesta facile, ruotando le risposte', () => {
  const t = targetConElementi();
  const sog = { repertorio: [{ id: 'rp_1', testo: 'cane', operante: 'tact' }, { id: 'rp_2', testo: 'gatto', operante: 'tact' }, { id: 'rp_3', testo: 'acqua', operante: 'mand' }], programmi: [{ target: [t] }] };
  const ev = [];
  const sequenza = [];
  for (let i = 0; i < 8; i++) {
    const p = R.prossimaProva(sog, t, ev);
    sequenza.push(p.tipo === 'training' ? 'T:' + p.elemento.testo : 'F:' + p.elemento.testo);
    ev.push(prova(i, 'I', p.elemento.id, p.tipo === 'mantenimento'));
  }
  assert.deepEqual(sequenza.map((x) => x[0]), ['T', 'F', 'T', 'F', 'T', 'F', 'T', 'F']);
  // Le richieste facili sono dello stesso operante del target (tact).
  assert.ok(sequenza.filter((x) => x[0] === 'F').every((x) => x === 'F:cane' || x === 'F:gatto'));
  // Le due risposte di training si alternano.
  assert.deepEqual(sequenza.filter((x) => x[0] === 'T'), ['T:mucca', 'T:pecora', 'T:mucca', 'T:pecora']);
  // Una facile ogni 2 prove di training.
  t.elementi.alternanza.ogni = 2;
  const ev2 = [];
  const tipi = [];
  for (let i = 0; i < 6; i++) {
    const p = R.prossimaProva(sog, t, ev2);
    tipi.push(p.tipo[0]);
    ev2.push(prova(i, 'I', p.elemento.id, p.tipo === 'mantenimento'));
  }
  assert.deepEqual(tipi, ['t', 't', 'm', 't', 't', 'm']);
  // Senza alternanza solo training.
  t.elementi.alternanza.attiva = false;
  assert.equal(R.prossimaProva(sog, t, ev2).tipo, 'training');
});

test('una risposta in insegnamento è pronta quando raggiunge il criterio sulle sue prove', () => {
  const t = targetConElementi();
  const [a, b] = R.inInsegnamento(t.elementi);
  const giorno = (k) => Date.UTC(2026, 9, 2 + k, 9);
  const punti = [0, 1, 2].map((k) => {
    const ev = [prova(1, 'I', a.id), prova(2, 'I', a.id), prova(3, 'V', b.id), prova(4, 'I', b.id)];
    const r = M.calcola({ tipo: 'dtt' }, ev, { inizio: giorno(k), fine: giorno(k) + 60000 });
    return { sessione: { inizio: giorno(k), operatoreId: 'op_1' }, valore: r.valore, dettagli: r.dettagli };
  });
  const stati = R.statoElementi(t, punti, null);
  assert.equal(stati[0].pronto, true);
  assert.equal(stati[0].sessioni, 3);
  assert.equal(stati[1].pronto, false);
  assert.equal(stati[1].ultimo, 50);
  // Con un criterio fino al prompt verbale anche la seconda è pronta.
  const conV = R.statoElementi(t, punti, { soglia: 90, verso: 'almeno', sessioni: 3, livelloPrompt: 'V' });
  assert.equal(conV[1].pronto, true);
});

test('dati di esempio: tact con obiettivo di 25, una risposta pronta e una da ripassare', () => {
  const stato = datiFinti.genera(new Date(2026, 9, 13));
  const sog = stato.config.soggetti[0];
  const pr = sog.programmi.find((p) => p.nome === 'Tact');
  const t = pr.target[0];
  assert.equal(t.protocollo.codice, 'Tact 6');
  const p = R.progresso(sog, t);
  assert.equal(p.obiettivo, 25);
  assert.equal(p.acquisiti, 15);
  const punti = archivio.serie(stato, sog, pr, t, { soloSincronizzate: true });
  assert.equal(punti.length, 18);
  const pronti = R.statoElementi(t, punti, archivio.criterioCorrente(pr, t)).filter((x) => x.pronto).map((x) => x.voce.testo);
  assert.deepEqual(pronti, ['pecora']);
  const errori = R.erroriMantenimento(punti, 5);
  const gatto = sog.repertorio.find((x) => x.testo === 'gatto');
  assert.ok(errori[gatto.id] >= 2);
  assert.ok(sog.schedule.voci.some((v) => v.targetId === t.id));
});

test('VB-MAPP: 170 milestone, 16 aree, numerazione per area e livello', () => {
  const vb = PR.MANUALI.find((m) => m.id === 'vbmapp');
  assert.equal(vb.voci.length, 170);
  assert.equal(vb.aree.length, 16);
  const perLivello = [1, 2, 3].map((l) => vb.voci.filter((v) => v.livello === l).length);
  assert.deepEqual(perLivello, [45, 60, 65]);
  assert.deepEqual(vb.voci.filter((v) => v.area === 'tact').map((v) => v.codice).slice(5, 7), ['Tact 6', 'Tact 7']);
  assert.equal(vb.voci.find((v) => v.codice === 'Intraverbale 6').livello, 2);
  // Nessun testo del manuale: le descrizioni delle milestone partono vuote.
  assert.ok(vb.voci.every((v) => v.descrizione === '' && v.quantita === null));
});

test('libreria: personalizzazioni e manuali aggiunti restano nello stato', () => {
  const stato = { config: { protocolli: [] } };
  PR.personalizza(stato, 'vbmapp', 'Tact 6', { descrizione: 'Mia descrizione', quantita: 25 });
  PR.personalizza(stato, 'vbmapp', 'Tact 6', { quantita: 30 });
  assert.equal(stato.config.protocolli.length, 1);
  const v = PR.voce(stato, 'vbmapp', 'Tact 6');
  assert.equal(v.descrizione, 'Mia descrizione');
  assert.equal(v.quantita, 30);
  assert.equal(v.personalizzata, true);
  // Il manuale integrato non cambia.
  assert.equal(PR.MANUALI[0].voci.find((x) => x.codice === 'Tact 6').quantita, null);

  const voci = PR.leggiVoci('G4; Tact; 1; Tact di oggetti; 50; tact\nC1; Ascoltatore; 1; Segue istruzioni\nsenza area\nG4; doppione');
  assert.equal(voci.length, 2);
  assert.deepEqual(voci[0], { codice: 'G4', area: 'Tact', livello: 1, descrizione: 'Tact di oggetti', quantita: 50, operante: 'tact' });
  assert.equal(voci[1].operante, 'altro');
  const m = PR.nuovoManuale(stato, 'Manuale del centro', voci);
  const letto = PR.manuale(stato, m.id);
  assert.equal(letto.proprio, true);
  assert.deepEqual(letto.aree.map((a) => a.id), ['Tact', 'Ascoltatore']);
  assert.equal(PR.manuali(stato).length, 2);
  const sog = { programmi: [{ target: [{ protocollo: { manuale: m.id, codice: 'G4' } }] }] };
  assert.equal(PR.targetCollegati(sog, m.id, 'G4').length, 1);
});

test('la libreria si sincronizza come documento “protocollo”', () => {
  const stato = datiFinti.genera(new Date(2026, 9, 13));
  PR.personalizza(stato, 'vbmapp', 'Mand 1', { descrizione: 'x' });
  const pronti = sync.daInviare(stato);
  assert.ok(pronti.documenti.some((d) => d.tipo === 'protocollo'));
});
