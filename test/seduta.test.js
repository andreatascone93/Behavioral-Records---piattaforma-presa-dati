'use strict';

/*
 * Organizzazione della seduta: proposta della scaletta, controlli sui tempi,
 * blocco in corso sul telefono, eventi con il contesto del blocco, grafici e
 * criteri sui soli probe.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const M = require('../app/js/modello.js');
require('../app/js/piano.js');
require('../app/js/repertorio.js');
const Sd = require('../app/js/seduta.js');
const F = require('../app/js/fedelta.js');
const datiFinti = require('../app/js/dati-finti.js');
const archivio = require('../app/js/archivio.js');

const metodo = (tipo) => ({ id: 'me_' + tipo, tipo, versione: 1, parametri: tipo === 'dtt' ? { prove: 10 } : {}, criterio: { soglia: 90, verso: 'almeno', sessioni: 3 } });

// Un soggetto con un comportamento problema (frequenza) e due DTT in trattamento.
function soggetto(durataMin) {
  const pr = {
    id: 'pr1', nome: 'Programma', fasi: [{ id: 'fa1', tipo: 'intervento', inizio: '2026-10-01' }],
    target: [
      { id: 'tp', nome: 'Colpi', ruolo: 'problema', metodo: metodo('frequenza') },
      { id: 'ta', nome: 'Tact', metodo: metodo('dtt') },
      { id: 'tb', nome: 'Mand', metodo: metodo('dtt') }
    ]
  };
  return {
    id: 'sg1', codice: 'PZ-1', programmi: [pr], operatori: ['op'],
    schedule: { id: 'sc1', nome: 'Seduta', durataMin, setting: 'Studio', voci: [{ targetId: 'tp' }, { targetId: 'ta' }, { targetId: 'tb' }] }
  };
}

function conScaletta(sog) {
  const p = Sd.proponi(sog);
  sog.schedule.blocchi = p.blocchi;
  sog.schedule.continui = p.continui;
  return p;
}

test('proposta: la scaletta riempie la durata, probe prima dell’insegnamento, problema per tutta la seduta', () => {
  for (const durata of [30, 45, 60, 90, 120]) {
    const sog = soggetto(durata);
    const p = conScaletta(sog);
    assert.equal(Sd.somma(p.blocchi), durata, 'durata ' + durata);
    assert.deepEqual(p.continui, ['tp']);
    const tipi = p.blocchi.map((b) => b.tipo);
    assert.equal(tipi[0], 'accoglienza');
    assert.equal(tipi[tipi.length - 1], 'chiusura');
    assert.ok(tipi.indexOf('probe') < tipi.indexOf('insegnamento'));
    assert.deepEqual(Sd.verifica(sog).filter((a) => a.livello === 'attenzione'), [], 'durata ' + durata);
    // Nessun blocco di insegnamento oltre il massimo senza pausa.
    p.blocchi.filter((b) => b.tipo === 'insegnamento').forEach((b) => assert.ok(b.durataMin <= Sd.PREDEFINITI.bloccoInsegnamentoMax + 3));
  }
});

test('proposta: il probe ritardato entra solo se c’è il ritardo, e allora rispetta il ritardo', () => {
  const breve = conScaletta(soggetto(30));
  assert.ok(!breve.blocchi.some((b) => b.tipo === 'probe_ritardato'));
  assert.match(breve.note[0], /probe a freddo della seduta successiva/);

  const sog = soggetto(90);
  const p = conScaletta(sog);
  const i = p.blocchi.findIndex((b) => b.tipo === 'probe_ritardato');
  assert.ok(i > 0);
  const rit = p.blocchi[i];
  assert.deepEqual(rit.targetIds, ['ta']); // metà dei target: il gruppo insegnato per primo
  const orari = Sd.orari(p.blocchi);
  const ultimoInsegnamento = Math.max(...p.blocchi.map((b, k) => (b.tipo === 'insegnamento' || b.tipo === 'mantenimento') && b.targetIds.includes('ta') ? orari[k].fine : 0));
  assert.ok(orari[i].inizio - ultimoInsegnamento >= Sd.PREDEFINITI.ritardoProbeMin);
  // Gli altri target si insegnano anche nei blocchi tardivi.
  assert.ok(p.blocchi.filter((b) => b.tipo === 'insegnamento').every((b) => b.targetIds.includes('tb')));
});

test('verifica: tempi che non tornano, probe dopo l’insegnamento, probe ritardato troppo vicino', () => {
  const sog = soggetto(30);
  const B = (tipo, durataMin, targetIds, extra) => Object.assign(Sd.blocco(tipo, durataMin, targetIds), extra || {});
  sog.schedule.continui = ['tp'];
  sog.schedule.blocchi = [
    B('insegnamento', 10, ['ta', 'tb']),
    B('probe', 2, ['ta']),
    B('probe_ritardato', 2, ['tb'], { ritardoMin: 30 })
  ];
  const testi = Sd.verifica(sog).map((a) => a.testo).join('\n');
  assert.match(testi, /dura 14 minuti, la seduta ne prevede 30/);
  assert.match(testi, /probe a freddo di “Tact” viene dopo l’insegnamento/);
  assert.match(testi, /probe ritardato di “Mand” arriva prima dei 30 minuti/);

  sog.schedule.blocchi = [B('accoglienza', 30, [])];
  assert.match(Sd.verifica(sog).map((a) => a.testo).join('\n'), /“Tact” non è in nessun blocco/);
});

test('seduta sul telefono: si parte dal primo blocco, si avanza, gli eventi portano il contesto', () => {
  const stato = { operatoreCorrente: 'op', sessioni: [], eventi: [] };
  const sog = soggetto(30);
  conScaletta(sog);
  const sess = archivio.apriSessione(stato, sog);
  assert.equal(sess.scaletta.length, sog.schedule.blocchi.length);
  assert.equal(Sd.bloccoInCorso(sess).blocco.tipo, 'accoglienza');
  const ta = sog.programmi[0].target[1], tp = sog.programmi[0].target[0];

  // Nell'accoglienza si vedono solo i target di tutta la seduta.
  assert.deepEqual(Sd.targetVisibili(sess, ['tp', 'ta', 'tb']), { continui: ['tp'], blocco: [] });
  archivio.registra(stato, sess, tp, 'occorrenza');
  assert.equal(stato.eventi[0].contesto, 'nessuno');

  const probe = Sd.passaA(sess, null, Date.now());
  assert.equal(probe.tipo, 'probe');
  assert.deepEqual(Sd.targetVisibili(sess, ['tp', 'ta', 'tb']).blocco, ['ta', 'tb']);
  archivio.registra(stato, sess, ta, 'prova', { esito: 'errore', prompt: null });
  // Il problema durante il probe non è un dato "di probe".
  const colpo = archivio.registra(stato, sess, tp, 'occorrenza');
  assert.equal(colpo.contesto, 'nessuno');
  assert.equal(stato.eventi[stato.eventi.length - 2].contesto, 'probe');

  const ins = Sd.passaA(sess, null, Date.now());
  assert.equal(ins.tipo, 'insegnamento');
  archivio.registra(stato, sess, ta, 'prova', { esito: 'corretta', prompt: 'I' });
  archivio.registra(stato, sess, ta, 'prova', { esito: 'corretta', prompt: 'V' });
  const sbagliata = archivio.registra(stato, sess, ta, 'prova', { esito: 'corretta', prompt: 'I' });
  archivio.annullaUltimo(stato, sess, ta);
  assert.equal(sbagliata.contesto, 'insegnamento');
  assert.equal(sbagliata.blocco, ins.id);

  archivio.chiudiSessione(stato, sess);
  assert.ok(sess.blocchiSvolti.every((b) => b.fine));
  assert.equal(Sd.bloccoInCorso(sess), null);

  const ev = archivio.eventiDi(stato, sess.id, 'ta');
  const r = Sd.valoriPerContesto(ta.metodo, ev, sess);
  assert.equal(r.probe.valore, 0);
  assert.equal(r.insegnamento.valore, 50); // l'annullata non conta
  assert.equal(r.insegnamento.dettagli.prove, 2);
});

test('passaA: si può tornare a un blocco e la scaletta finisce dopo l’ultimo', () => {
  const sess = { scaletta: [{ id: 'a', tipo: 'probe', targetIds: [] }, { id: 'b', tipo: 'chiusura', targetIds: [] }], blocchiSvolti: [{ bloccoId: 'a', inizio: 0 }] };
  assert.equal(Sd.passaA(sess, null, 10).id, 'b');
  assert.equal(Sd.passaA(sess, 'a', 20).id, 'a');
  assert.deepEqual(sess.blocchiSvolti.map((x) => [x.bloccoId, x.inizio, x.fine]), [['a', 0, 10], ['b', 10, 20], ['a', 20, undefined]]);
  assert.equal(Sd.passaA(sess, null, 30).id, 'b');
  assert.equal(Sd.passaA(sess, null, 40), null);
  assert.equal(Sd.bloccoInCorso(sess), null);
});

test('probe ritardato: il telefono dice quanto manca al ritardo dalla fine dell’insegnamento', () => {
  const min = 60000;
  const sess = {
    scaletta: [{ id: 'i', tipo: 'insegnamento', targetIds: ['ta'] }, { id: 'p', tipo: 'pausa', targetIds: [] }, { id: 'r', tipo: 'probe_ritardato', ritardoMin: 30, targetIds: ['ta'] }],
    blocchiSvolti: [{ bloccoId: 'i', inizio: 0, fine: 10 * min }, { bloccoId: 'p', inizio: 10 * min, fine: 25 * min }, { bloccoId: 'r', inizio: 25 * min }]
  };
  const r = sess.scaletta[2];
  assert.equal(Sd.attesaRitardo(sess, r, 25 * min), 15 * min);
  assert.equal(Sd.attesaRitardo(sess, r, 45 * min), 0);
});

test('serie e criterio sui soli probe: contano solo le sedute con il probe', () => {
  const sog = soggetto(30);
  conScaletta(sog);
  const pr = sog.programmi[0], ta = pr.target[1];
  ta.metodo.criterio = { soglia: 100, verso: 'almeno', sessioni: 2, contesto: 'probe' };
  const stato = { operatoreCorrente: 'op', sessioni: [], eventi: [] };
  const seduta = (probeOk, conProbe) => {
    const sess = archivio.apriSessione(stato, sog);
    sess.fasiId = { pr1: 'fa1' };
    Sd.passaA(sess, null, Date.now()); // probe
    if (conProbe) archivio.registra(stato, sess, ta, 'prova', probeOk ? { esito: 'corretta', prompt: 'I' } : { esito: 'errore', prompt: null });
    Sd.passaA(sess, null, Date.now()); // insegnamento
    for (let i = 0; i < 4; i++) archivio.registra(stato, sess, ta, 'prova', { esito: 'corretta', prompt: i ? 'I' : 'G' });
    archivio.chiudiSessione(stato, sess);
  };
  seduta(true, true);
  seduta(false, false); // senza probe: non interrompe la serie
  seduta(true, true);
  const punti = archivio.serie(stato, sog, pr, ta, {});
  assert.equal(punti.length, 3);
  assert.deepEqual(punti.map((p) => p.valore), [80, 75, 80]);
  assert.deepEqual(Sd.serieNelContesto(punti, 'probe').map((p) => p.valore), [100, 100]);
  assert.deepEqual(Sd.serieNelContesto(punti, 'insegnamento').map((p) => p.valore), [75, 75, 75]);
  const c = archivio.statoCriterio(pr, ta, punti);
  assert.equal(c.raggiunto, true);
  assert.equal(M.valoreCriterio(ta.metodo.criterio, 'dtt', punti[1]), null);
  assert.match(M.descriviCriterio(ta.metodo.criterio, 'dtt'), /valutato sui soli probe/);
});

test('dati finti: ogni paziente ha una scaletta valida e le ultime sedute hanno i probe', () => {
  const stato = datiFinti.genera(new Date(2026, 9, 13));
  for (const s of stato.config.soggetti) {
    assert.ok(Sd.haScaletta(s), s.codice);
    assert.equal(Sd.somma(s.schedule.blocchi), s.schedule.durataMin);
    assert.deepEqual(Sd.verifica(s).filter((a) => a.livello === 'attenzione'), [], s.codice);
  }
  const conProbe = stato.eventi.filter((e) => e.contesto === 'probe');
  assert.ok(conProbe.length > 0);
  // Le sedute con la scaletta conservano i blocchi svolti.
  const conScalettaSvolta = stato.sessioni.filter((x) => x.blocchiSvolti && x.blocchiSvolti.length);
  assert.equal(conScalettaSvolta.length, 6 * stato.config.soggetti.length);
});

test('fedeltà: le risposte nei probe non sono occasioni di rinforzo', () => {
  const S = Date.UTC(2026, 9, 12, 9, 0, 0);
  const t = { id: 'ta', nome: 'Tact', metodo: metodo('dtt') };
  const c = { id: 'c1', targetId: 'ta', procedura: 'rinforzo_positivo', schema: { tipo: 'CRF' } };
  const prova = (id, sec, contesto) => ({ id, tipo: 'prova', t: S + sec * 1000, targetId: 'ta', contesto, valore: { esito: 'corretta', prompt: 'I' } });
  const data = (id, sec) => ({ id, tipo: 'conseguenza', t: S + sec * 1000, targetId: 'ta', valore: { contingenzaId: 'c1', azione: 'data' } });
  const eventi = [prova('p1', 10, 'probe'), prova('p2', 60, 'insegnamento'), data('d2', 61), prova('p3', 90, 'insegnamento'), data('d3', 91)];
  const r = F.seduta({ contingenze: [c] }, [t], eventi, { inizio: S, fine: S + 600000 });
  assert.equal(r.percentuale, 100);
  assert.equal(r.opportunita, 2);
});

test('proposta allineata alla letteratura: preferenze e NET nelle sedute lunghe, probe di 3 prove, mantenimento sui padroneggiati', () => {
  const sog = soggetto(90);
  // Un terzo DTT già in mantenimento: va nei probe di mantenimento, non nell'insegnamento.
  sog.programmi.push({ id: 'pr2', nome: 'Già appreso', fasi: [{ id: 'fa2', tipo: 'mantenimento', inizio: '2026-09-01' }], target: [{ id: 'tm', nome: 'Imita', metodo: metodo('dtt') }] });
  sog.schedule.voci.push({ targetId: 'tm' });
  const p = conScaletta(sog);
  const tipi = p.blocchi.map((b) => b.tipo);
  assert.equal(tipi[1], 'preferenze');
  assert.ok(tipi.includes('net'));
  const probe = p.blocchi.find((b) => b.tipo === 'probe');
  assert.equal(probe.prove, 3);
  assert.deepEqual(probe.targetIds, ['ta', 'tb']);
  const mant = p.blocchi.find((b) => b.tipo === 'mantenimento');
  assert.deepEqual(mant.targetIds, ['tm']);
  assert.equal(Sd.TIPI.mantenimento.contesto, 'probe');
  assert.ok(p.blocchi.filter((b) => b.tipo === 'insegnamento' || b.tipo === 'net').every((b) => !b.targetIds.includes('tm')));
  assert.equal(Sd.somma(p.blocchi), 90);
  assert.deepEqual(Sd.verifica(sog).filter((a) => a.livello === 'attenzione'), []);

  const breve = conScaletta(soggetto(30)).blocchi.map((b) => b.tipo);
  assert.ok(!breve.includes('preferenze') && !breve.includes('net'));
});

test('verifica: con un comportamento a funzione di fuga ricorda come dare la pausa', () => {
  const sog = soggetto(60);
  sog.programmi[0].target[0].funzione = { ipotesi: 'fuga' };
  conScaletta(sog);
  assert.match(Sd.verifica(sog).map((a) => a.testo).join('\n'), /“Colpi” l’ipotesi di funzione è la fuga: passa alla pausa dopo una risposta alternativa/);
  assert.deepEqual(Sd.conFuga(sog).map((t) => t.id), ['tp']);
});

test('scaletta svolta: conteggio dei comportamenti per blocco', () => {
  const min = 60000;
  const sess = {
    scaletta: [{ id: 'a', tipo: 'insegnamento', nome: 'DTT', durataMin: 10, targetIds: [] }, { id: 'b', tipo: 'pausa', nome: 'Pausa', durataMin: 5, targetIds: [] }],
    blocchiSvolti: [{ bloccoId: 'a', inizio: 0, fine: 10 * min }, { bloccoId: 'b', inizio: 10 * min, fine: 15 * min }]
  };
  const occ = (id, t) => ({ id, tipo: 'occorrenza', t, targetId: 'tp' });
  const eventi = [occ('1', 1 * min), occ('2', 2 * min), occ('3', 3 * min), occ('4', 12 * min), { id: '5', tipo: 'annulla', rif: '3', t: 3 * min + 1, targetId: 'tp' }];
  const r = Sd.riassuntoSvolti(sess, eventi);
  assert.deepEqual(r.map((x) => [x.nome, x.minuti, x.occorrenze.tp]), [['DTT', 10, 2], ['Pausa', 5, 1]]);
});
