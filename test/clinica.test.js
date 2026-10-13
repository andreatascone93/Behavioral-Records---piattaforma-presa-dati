'use strict';

/*
 * Lacune cliniche: criteri di padronanza per livello di prompt, prima prova
 * del giorno, più operatori e setting; timer del DRL e dello schema multiplo;
 * fedeltà del trattamento in percentuale.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const M = require('../app/js/modello.js');
const piano = require('../app/js/piano.js');
const F = require('../app/js/fedelta.js');
const datiFinti = require('../app/js/dati-finti.js');
const archivio = require('../app/js/archivio.js');

const S = Date.UTC(2026, 9, 12, 9, 0, 0);
let n = 0;
const ev = (tipo, sec, valore, targetId) => ({ id: 'e' + ++n, tipo, t: S + sec * 1000, valore, targetId });
const cons = (sec, contingenzaId, azione, targetId, extra) => ev('conseguenza', sec, Object.assign({ contingenzaId, azione }, extra), targetId);
const prova = (sec, prompt) => ev('prova', sec, prompt === 'errore' ? { esito: 'errore', prompt: null } : { esito: 'corretta', prompt });

// ---- Criteri di padronanza ------------------------------------------------------

test('criterio: con un livello di prompt contano le risposte a quel livello o meno intrusive', () => {
  const prove = ['V', 'I', 'I', 'G', 'V', 'I', 'errore', 'I', 'M', 'I'].map((p, i) => prova(i * 30, p));
  const r = M.calcola({ tipo: 'dtt' }, prove, { inizio: S, fine: S + 600000 });
  assert.equal(r.valore, 50); // 5 indipendenti su 10
  const punto = { valore: r.valore, dettagli: r.dettagli };
  assert.equal(M.valoreCriterio({ soglia: 80, verso: 'almeno', sessioni: 3 }, 'dtt', punto), 50);
  assert.equal(M.valoreCriterio({ soglia: 80, verso: 'almeno', sessioni: 3, livelloPrompt: 'V' }, 'dtt', punto), 70);
  assert.equal(M.valoreCriterio({ soglia: 80, verso: 'almeno', sessioni: 3, livelloPrompt: 'G' }, 'dtt', punto), 80);
  assert.equal(M.valoreCriterio({ soglia: 80, verso: 'almeno', sessioni: 3, livelloPrompt: 'M' }, 'dtt', punto), 90);

  const passi = [ev('passo', 1, { indice: 0, prompt: 'I' }), ev('passo', 2, { indice: 1, prompt: 'V' }), ev('passo', 3, { indice: 2, prompt: 'FP' }), ev('passo', 4, { indice: 3, prompt: 'G' })];
  const ta = M.calcola({ tipo: 'task_analysis' }, passi, { inizio: S, fine: S + 60000 });
  assert.equal(M.valoreCriterio({ livelloPrompt: 'G' }, 'task_analysis', { valore: ta.valore, dettagli: ta.dettagli }), 75);
  assert.match(M.descriviCriterio({ soglia: 80, verso: 'almeno', sessioni: 3, livelloPrompt: 'V' }, 'dtt'), /≥ 80 % risposte corrette con prompt verbale o meno intrusivo per 3 sessioni/);
});

test('criterio: prima prova del giorno, solo la prima seduta di ogni giorno', () => {
  const c = { soglia: 100, verso: 'almeno', sessioni: 2, primaProva: true };
  const sbagliata = M.calcola({ tipo: 'dtt' }, [prova(0, 'errore'), prova(30, 'I')], { inizio: S, fine: S + 60000 });
  const giusta = M.calcola({ tipo: 'dtt' }, [prova(0, 'I'), prova(30, 'errore')], { inizio: S, fine: S + 60000 });
  assert.equal(M.valoreCriterio(c, 'dtt', sbagliata), 0);
  assert.equal(M.valoreCriterio(c, 'dtt', giusta), 100);
  assert.equal(M.valoreCriterio(Object.assign({ livelloPrompt: 'V' }, c), 'dtt', M.calcola({ tipo: 'dtt' }, [prova(0, 'V')], { inizio: S, fine: S + 60000 })), 100);

  const giorno = (g, ora) => new Date(2026, 9, g, ora).getTime();
  const punti = [
    { sessione: { inizio: giorno(5, 9) }, dettagli: giusta.dettagli },
    { sessione: { inizio: giorno(5, 15) }, dettagli: sbagliata.dettagli },
    { sessione: { inizio: giorno(6, 9) }, dettagli: { primaProva: null } },
    { sessione: { inizio: giorno(6, 11) }, dettagli: giusta.dettagli }
  ];
  const tenuti = archivio.primaSedutaDelGiorno(punti);
  assert.deepEqual(tenuti.map((p) => p.sessione.inizio), [giorno(5, 9), giorno(6, 11)]);
  assert.match(M.descriviCriterio(c, 'dtt'), /Prima prova del giorno corretta e indipendente per 2 giorni consecutivi/);
});

test('criterio: più operatori e più setting tra le sessioni consecutive a criterio', () => {
  const c = { soglia: 80, verso: 'almeno', sessioni: 3, minOperatori: 2, minSetting: 2 };
  const v = (valore, operatore, setting) => ({ valore, operatore, setting });
  const stesso = M.verificaCriterio(c, [v(90, 'a', 'Studio'), v(90, 'a', 'Studio'), v(95, 'a', 'Studio')]);
  assert.equal(stesso.raggiunto, false);
  assert.equal(stesso.mancano, 0);
  assert.equal(stesso.mancanoOperatori, 1);
  assert.equal(stesso.mancanoSetting, 1);
  assert.equal(M.statoCriterioBreve(stesso), 'A criterio, manca un altro operatore e un altro setting');
  const misto = M.verificaCriterio(c, [v(60, 'b', 'Casa'), v(90, 'a', 'Studio'), v(90, 'b', 'studio '), v(95, 'a', 'Casa')]);
  assert.equal(misto.raggiunto, true);
  assert.equal(misto.operatori, 2);
  assert.equal(misto.setting, 2); // "Studio" e "studio " sono lo stesso setting
  // Senza richieste in più i numeri semplici funzionano come prima.
  assert.equal(M.verificaCriterio({ soglia: 80, verso: 'almeno', sessioni: 2 }, [90, 85]).raggiunto, true);
  assert.match(M.descriviCriterio(c, 'frequenza'), /con almeno 2 operatori diversi, in almeno 2 setting diversi$/);
});

test('archivio: il criterio della fase in corso usa operatori e setting delle sedute', () => {
  const stato = datiFinti.genera('2026-10-13T12:00:00');
  const pz = stato.config.soggetti.find((s) => s.codice === 'PZ-014');
  const x = archivio.targetDi(pz).find((y) => y.target.nome === 'Chiede aiuto');
  const punti = archivio.serie(stato, pz, x.programma, x.target, {});
  assert.equal(archivio.statoCriterio(x.programma, x.target, punti).raggiunto, true);
  // Con 3 setting richiesti non basta: le sedute sono tutte in studio.
  x.target.metodo.criterio = Object.assign({}, x.target.metodo.criterio, { minSetting: 3 });
  const c = archivio.statoCriterio(x.programma, x.target, punti);
  assert.equal(c.raggiunto, false);
  assert.equal(c.mancanoSetting, 2);
});

// ---- Timer DRL e schema multiplo --------------------------------------------------

test('piano: DRL a sessione intera conta le risposte entro il limite', () => {
  const c = { id: 'l1', targetId: 'p', procedura: 'drl', parametri: { variante: 'sessione', limite: 2 } };
  const due = [ev('occorrenza', 10), ev('occorrenza', 20)];
  assert.equal(piano.statoDrl(c, due, S + 60000).entro, true);
  const tre = due.concat([ev('occorrenza', 30)]);
  const st = piano.statoDrl(c, tre, S + 60000);
  assert.equal(st.risposte, 3);
  assert.equal(st.entro, false);
});

test('piano: DRL a intervalli chiede il rinforzo per l’intervallo appena concluso entro il limite', () => {
  const c = { id: 'l2', targetId: 'p', procedura: 'drl', parametri: { variante: 'intervalli', limite: 1, intervalloSec: 60 } };
  const avvio = cons(0, 'l2', 'avvio');
  const eventi = [avvio, ev('occorrenza', 10), ev('occorrenza', 70), ev('occorrenza', 80)];
  // A 65 s: il primo intervallo (1 risposta) è entro il limite.
  const a = piano.statoDrl(c, eventi.slice(0, 2), S + 65000);
  assert.equal(a.domanda, 0);
  assert.equal(a.restanteMs, 55000);
  // A 125 s: il secondo intervallo (2 risposte) supera il limite, niente domanda;
  // il primo non è stato segnato e risulta saltato.
  const b = piano.statoDrl(c, eventi, S + 125000);
  assert.equal(b.domanda, null);
  assert.equal(b.saltati, 1);
  assert.equal(b.persi, 1);
  const segnato = piano.statoDrl(c, eventi.concat([cons(66, 'l2', 'rinforzo', 'p', { indice: 0 })]), S + 125000);
  assert.equal(segnato.saltati, 0);
  assert.equal(segnato.segnati, 1);
});

test('piano: DRL a risposte distanziate rinforza solo dopo l’IRT minimo', () => {
  const c = { id: 'l3', targetId: 'p', procedura: 'drl', parametri: { variante: 'distanziate', intervalloSec: 30 } };
  const avvio = cons(0, 'l3', 'avvio');
  const vicina = ev('occorrenza', 10);
  let st = piano.statoDrl(c, [avvio, vicina], S + 20000);
  assert.equal(st.dovuto, false);
  assert.equal(st.restanteMs, 20000); // la prossima vale da 40 s
  const lontana = ev('occorrenza', 50);
  st = piano.statoDrl(c, [avvio, vicina, lontana], S + 51000);
  assert.equal(st.dovuto, true);
  // Un'altra risposta prima del rinforzo: rinforzo mancato.
  st = piano.statoDrl(c, [avvio, vicina, lontana, ev('occorrenza', 55)], S + 56000);
  assert.equal(st.mancati, 1);
  assert.equal(st.dovuto, false);
});

test('piano: lo schema multiplo alterna SD e SΔ dall’avvio', () => {
  const c = { id: 'm1', procedura: 'fct', schema: { tipo: 'CRF', segnalato: { sdSec: 60, sdeltaSec: 30, stimoloSd: 'verde', stimoloSdelta: 'rosso' } } };
  const avvio = cons(0, 'm1', 'avvio');
  assert.equal(piano.statoMultiplo(c, [], S).attivo, false);
  let st = piano.statoMultiplo(c, [avvio], S + 20000);
  assert.equal(st.componente, 'sd');
  assert.equal(st.restanteMs, 40000);
  st = piano.statoMultiplo(c, [avvio], S + 70000);
  assert.equal(st.componente, 'sdelta');
  assert.equal(st.restanteMs, 20000);
  st = piano.statoMultiplo(c, [avvio], S + 95000);
  assert.equal(st.componente, 'sd');
  assert.equal(st.ciclo, 1);
  const ferma = cons(100, 'm1', 'ferma');
  assert.equal(piano.componenteMultiplo(c, [avvio, ferma], S + 70000), 'sdelta');
  assert.equal(piano.componenteMultiplo(c, [avvio, ferma], S + 120000), null);
});

// ---- Fedeltà del trattamento -----------------------------------------------------

const prob = { id: 'p', nome: 'Colpire', metodo: { tipo: 'frequenza' } };
const alt = { id: 'a', nome: 'Chiede pausa', metodo: { tipo: 'frequenza' } };
const seduta = { inizio: S, fine: S + 600000 };

test('fedeltà: FCT ed estinzione, con omissioni e commissioni', () => {
  const fct = { id: 'f1', targetId: 'p', procedura: 'fct', schema: { tipo: 'CRF' }, parametri: { alternativoId: 'a', problema: 'estinzione' } };
  const ext = { id: 'x1', targetId: 'p', procedura: 'estinzione', parametri: { variante: 'fuga' } };
  const eventi = [
    ev('occorrenza', 10, null, 'a'), cons(11, 'f1', 'data', 'a'),
    ev('occorrenza', 20, null, 'a'), // omissione
    ev('occorrenza', 30, null, 'p'), cons(31, 'x1', 'errore', 'p'), // commissione
    ev('occorrenza', 40, null, 'p')
  ];
  const r = F.seduta({ contingenze: [fct, ext] }, [prob, alt], eventi, seduta);
  assert.deepEqual(r.righe.map((x) => [x.sigla, x.corrette, x.omissioni, x.commissioni]), [['FCT', 1, 1, 0], ['EXT', 1, 0, 1]]);
  assert.equal(r.percentuale, 50);
  assert.equal(F.descriviErrori(r), '1 omissione, 1 commissione');
});

test('fedeltà: senza estinzione separata, l’FCT conta anche il problema rinforzato per errore', () => {
  const fct = { id: 'f2', targetId: 'p', procedura: 'fct', schema: { tipo: 'FR', valore: 2 }, parametri: { alternativoId: 'a', problema: 'estinzione' } };
  const eventi = [
    ev('occorrenza', 10, null, 'a'), ev('occorrenza', 20, null, 'a'), cons(21, 'f2', 'data', 'a'),
    ev('occorrenza', 30, null, 'a'), cons(31, 'f2', 'data', 'a'), // FR 2: una sola dovuta, la seconda è in più
    ev('occorrenza', 40, null, 'p'), cons(41, 'f2', 'errore', 'p')
  ];
  const r = F.seduta({ contingenze: [fct] }, [prob, alt], eventi, seduta);
  assert.deepEqual([r.corrette, r.omissioni, r.commissioni], [1, 0, 2]);
});

test('fedeltà: schema multiplo, un rinforzo in SΔ è una commissione', () => {
  const fct = { id: 'f3', targetId: 'p', procedura: 'fct', schema: { tipo: 'CRF', segnalato: { sdSec: 60, sdeltaSec: 60 } }, parametri: { alternativoId: 'a', problema: 'estinzione' } };
  const ext = { id: 'x3', targetId: 'p', procedura: 'estinzione', parametri: {} };
  const eventi = [
    cons(0, 'f3', 'avvio', 'a'),
    ev('occorrenza', 10, null, 'a'), cons(11, 'f3', 'data', 'a'), // SD, rinforzata: corretta
    ev('occorrenza', 70, null, 'a'), // SΔ, non rinforzata: corretta
    ev('occorrenza', 80, null, 'a'), cons(81, 'f3', 'data', 'a') // SΔ, rinforzata: commissione
  ];
  const r = F.seduta({ contingenze: [fct, ext] }, [prob, alt], eventi, seduta);
  const riga = r.righe[0];
  assert.deepEqual([riga.corrette, riga.omissioni, riga.commissioni], [2, 0, 1]);
});

test('fedeltà: DRO a intervallo intero e momentaneo, DRL, procedure non calcolabili', () => {
  const dro = { id: 'd1', targetId: 'p', procedura: 'dro', parametri: { variante: 'intervallo_fisso', intervalloSec: 60, azzera: true } };
  // Rinforzo dato a 61 s; il secondo intervallo scade a 121 s e il problema a
  // 130 s lo fa perdere: un'omissione.
  const eventi = [cons(0, 'd1', 'avvio', 'p'), cons(61, 'd1', 'rinforzo', 'p'), ev('occorrenza', 130, null, 'p'), cons(140, 'd1', 'ferma', 'p')];
  const r = F.seduta({ contingenze: [dro] }, [prob], eventi, seduta);
  assert.deepEqual([r.corrette, r.omissioni], [1, 1]);

  const mom = { id: 'd2', targetId: 'p', procedura: 'dro', parametri: { variante: 'momentaneo_fisso', intervalloSec: 30 } };
  const ev2 = [cons(0, 'd2', 'avvio', 'p'), cons(31, 'd2', 'momento', 'p', { indice: 0, presente: false }), cons(95, 'd2', 'ferma', 'p')];
  // Fermato a 95 s: 3 controlli conclusi, 1 segnato.
  const r2 = F.seduta({ contingenze: [mom] }, [prob], ev2, seduta);
  assert.deepEqual([r2.corrette, r2.omissioni], [1, 2]);

  const drl = { id: 'l9', targetId: 'p', procedura: 'drl', parametri: { variante: 'sessione', limite: 3 } };
  const ev3 = [ev('occorrenza', 10, null, 'p')];
  assert.equal(F.seduta({ contingenze: [drl] }, [prob], ev3, seduta).omissioni, 1);
  assert.equal(F.seduta({ contingenze: [drl] }, [prob], ev3.concat([cons(590, 'l9', 'rinforzo', 'p')]), seduta).percentuale, 100);

  const vi = { id: 'v1', targetId: 'a', procedura: 'rinforzo_positivo', schema: { tipo: 'VI', valore: 60 } };
  const r4 = F.seduta({ contingenze: [vi] }, [alt], [ev('occorrenza', 10, null, 'a')], seduta);
  assert.equal(r4.righe[0].valutabile, false);
  assert.equal(r4.percentuale, null);
});

test('dati finti: la fedeltà del trattamento compare nelle sedute di intervento', () => {
  const stato = datiFinti.genera('2026-10-13T12:00:00');
  const pz = stato.config.soggetti.find((s) => s.codice === 'PZ-014');
  const serie = F.serie(stato, pz, pz.programmi[0], {});
  assert.ok(serie.length >= 10);
  for (const r of serie) {
    assert.ok(r.percentuale >= 0 && r.percentuale <= 100);
    assert.notEqual(r.faseNome, 'Baseline');
  }
  assert.ok(serie.some((r) => r.omissioni > 0), 'qualche omissione nei dati finti');
});
