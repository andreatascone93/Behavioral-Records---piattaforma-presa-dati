'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const M = require('../prototipo/js/modello.js');
const datiFinti = require('../prototipo/js/dati-finti.js');
const archivio = require('../prototipo/js/archivio.js');

const S = Date.UTC(2026, 9, 12, 9, 0, 0);
const sessione = { inizio: S, fine: S + 10 * 60000 };
let n = 0;
const ev = (tipo, sec, valore, extra) => Object.assign({ id: 'e' + ++n, tipo, t: S + sec * 1000, valore }, extra);

test('frequenza: tasso per minuto, gli eventi annullati non contano', () => {
  const a = ev('occorrenza', 10);
  const eventi = [a, ev('occorrenza', 20), ev('occorrenza', 30), ev('annulla', 31, null, { rif: a.id })];
  const r = M.calcola({ tipo: 'frequenza' }, eventi, sessione);
  assert.equal(r.dettagli.conteggio, 2);
  assert.equal(r.valore, 0.2);
});

test('durata: somma degli episodi, un episodio aperto si chiude a fine sessione', () => {
  const eventi = [ev('inizio', 0), ev('fine', 60), ev('inizio', 540)];
  const r = M.calcola({ tipo: 'durata' }, eventi, sessione);
  assert.equal(r.dettagli.episodi, 2);
  assert.equal(r.valore, 2); // 60 s + 60 s
});

test('latenza: media delle coppie istruzione-risposta', () => {
  const eventi = [ev('istruzione', 0), ev('risposta', 2), ev('istruzione', 10), ev('risposta', 14)];
  const r = M.calcola({ tipo: 'latenza' }, eventi, sessione);
  assert.equal(r.valore, 3);
  assert.equal(r.dettagli.mediana, 3);
});

test('IRT: media dei tempi tra risposte', () => {
  const eventi = [ev('occorrenza', 0), ev('occorrenza', 10), ev('occorrenza', 30)];
  assert.equal(M.calcola({ tipo: 'irt' }, eventi, sessione).valore, 15);
});

test('intervalli: percentuale, vale l’ultimo esito di ogni intervallo', () => {
  const eventi = [
    ev('intervallo', 10, { indice: 0, presente: true }),
    ev('intervallo', 20, { indice: 1, presente: true }),
    ev('intervallo', 21, { indice: 1, presente: false }),
    ev('intervallo', 30, { indice: 2, presente: false }),
    ev('intervallo', 40, { indice: 3, presente: true })
  ];
  for (const tipo of ['intervallo_parziale', 'intervallo_totale', 'momentaneo']) {
    assert.equal(M.calcola({ tipo }, eventi, sessione).valore, 50);
  }
});

test('DTT: percentuale di risposte corrette indipendenti e distribuzione dei prompt', () => {
  const eventi = [
    ev('prova', 1, { esito: 'corretta', prompt: 'I' }),
    ev('prova', 2, { esito: 'corretta', prompt: 'I' }),
    ev('prova', 3, { esito: 'corretta', prompt: 'G' }),
    ev('prova', 4, { esito: 'errore', prompt: null })
  ];
  const r = M.calcola({ tipo: 'dtt' }, eventi, sessione);
  assert.equal(r.valore, 50);
  assert.equal(r.dettagli.distribuzione.G, 1);
  assert.equal(r.dettagli.distribuzione.errore, 1);
});

test('task analysis: percentuale di passi indipendenti', () => {
  const eventi = [0, 1, 2, 3].map((i) => ev('passo', i, { indice: i, prompt: i < 3 ? 'M' : 'I' }));
  assert.equal(M.calcola({ tipo: 'task_analysis' }, eventi, sessione).valore, 25);
});

test('ABC: conta gli episodi e le combinazioni', () => {
  const v = { a: 'Transizione', b: 'Colpire', c: 'Attenzione' };
  const r = M.calcola({ tipo: 'abc' }, [ev('abc', 1, v), ev('abc', 2, v)], sessione);
  assert.equal(r.valore, 2);
  assert.equal(r.dettagli.combinazioni['Transizione → Colpire → Attenzione'], 2);
});

test('criterio: conta le sessioni consecutive in fondo alla serie', () => {
  const c = { soglia: 80, verso: 'almeno', sessioni: 3 };
  assert.deepEqual(M.verificaCriterio(c, [90, 70, 80, 85, 90]), { raggiunto: true, consecutive: 3, mancano: 0 });
  assert.deepEqual(M.verificaCriterio(c, [90, 90, 70, 85]), { raggiunto: false, consecutive: 1, mancano: 2 });
  const giu = { soglia: 0.1, verso: 'al_massimo', sessioni: 3 };
  assert.equal(M.verificaCriterio(giu, [0.05, 0.08, 0.1]).raggiunto, true);
});

test('dati finti: deterministici, con sessioni ed eventi per ogni paziente', () => {
  const a = datiFinti.genera('2026-10-13T12:00:00');
  const b = datiFinti.genera('2026-10-13T12:00:00');
  assert.deepEqual(a, b);
  assert.equal(a.config.soggetti.length, 3);
  for (const s of a.config.soggetti) {
    assert.ok(a.sessioni.some((x) => x.soggettoId === s.id));
    for (const { target } of archivio.targetDi(s)) {
      assert.ok(a.eventi.some((e) => e.targetId === target.id), target.nome + ' senza eventi');
    }
  }
});

test('dati finti: "Chiede aiuto" raggiunge la padronanza, "Colpire gli altri" no', () => {
  const stato = datiFinti.genera('2026-10-13T12:00:00');
  const pz = stato.config.soggetti[0];
  const cerca = (nome) => archivio.targetDi(pz).find((x) => x.target.nome === nome);
  const aiuto = cerca('Chiede aiuto');
  const punti = archivio.serie(stato, pz, aiuto.programma, aiuto.target, {});
  assert.equal(archivio.statoCriterio(aiuto.programma, aiuto.target, punti).raggiunto, true);
  const colpire = cerca('Colpire gli altri');
  const p2 = archivio.serie(stato, pz, colpire.programma, colpire.target, {});
  assert.equal(archivio.statoCriterio(colpire.programma, colpire.target, p2).raggiunto, false);
});

test('archivio: una sessione registrata offline arriva al desktop solo dopo la sincronizzazione', () => {
  const stato = datiFinti.genera('2026-10-13T12:00:00');
  const pz = stato.config.soggetti[0];
  const { programma, target } = archivio.targetDi(pz)[0];
  const prima = archivio.serie(stato, pz, programma, target, { soloSincronizzate: true }).length;

  stato.rete.simulaOffline = true;
  const s = archivio.apriSessione(stato, pz);
  archivio.registra(stato, s, target, 'occorrenza');
  archivio.registra(stato, s, target, 'occorrenza');
  archivio.annullaUltimo(stato, s, target);
  archivio.chiudiSessione(stato, s);

  assert.equal(archivio.inAttesa(stato), 3);
  assert.equal(archivio.sincronizza(stato), 0, 'offline non si invia nulla');
  assert.equal(archivio.serie(stato, pz, programma, target, { soloSincronizzate: true }).length, prima);
  assert.equal(archivio.serie(stato, pz, programma, target, {}).length, prima + 1, 'il telefono vede subito la sessione');

  stato.rete.simulaOffline = false;
  assert.equal(archivio.sincronizza(stato), 3);
  const dopo = archivio.serie(stato, pz, programma, target, { soloSincronizzate: true });
  assert.equal(dopo.length, prima + 1);
  assert.equal(dopo[dopo.length - 1].dettagli.conteggio, 1);
});

test('archivio: cambiando il tipo di misura le sessioni vecchie escono dal grafico', () => {
  const stato = datiFinti.genera('2026-10-13T12:00:00');
  const pz = stato.config.soggetti[0];
  const { programma, target } = archivio.targetDi(pz)[0];
  const prima = archivio.serie(stato, pz, programma, target, {}).length;
  target.metodo.storico = [{ versione: 1, tipo: target.metodo.tipo, parametri: target.metodo.parametri }];
  target.metodo.versione = 2;
  target.metodo.tipo = 'intervallo_parziale';
  target.metodo.parametri = { intervalloSec: 10, osservazioneMin: 5 };
  const dopo = archivio.serie(stato, pz, programma, target, {});
  assert.equal(dopo.length, 0);
  assert.equal(dopo.escluse, prima);
});

test('archivio: cambiando solo i parametri le sessioni vecchie usano la loro versione', () => {
  const stato = datiFinti.genera('2026-10-13T12:00:00');
  const pz = stato.config.soggetti[1];
  const { programma, target } = archivio.targetDi(pz)[0];
  const prima = archivio.serie(stato, pz, programma, target, {}).map((p) => p.valore);
  target.metodo.storico = [{ versione: 1, tipo: target.metodo.tipo, parametri: target.metodo.parametri }];
  target.metodo.versione = 2;
  target.metodo.parametri = { intervalloSec: 15, osservazioneMin: 5 };
  assert.deepEqual(archivio.serie(stato, pz, programma, target, {}).map((p) => p.valore), prima);
});

const piano = require('../prototipo/js/piano.js');

test('piano: descrizioni di schemi e conseguenze', () => {
  assert.equal(piano.descriviSchema({ tipo: 'FR', valore: 3 }), 'FR 3');
  assert.equal(piano.descriviSchema({ tipo: 'VI', valore: 120 }), 'VI 120 s');
  assert.equal(piano.descriviSchema({ tipo: 'CRF', segnalato: { sdSec: 60, sdeltaSec: 30 } }), 'mult CRF/EXT (60 s con SD, 30 s con SΔ)');
  const t = { a: { id: 'a', nome: 'Chiede una pausa' } };
  const dra = { procedura: 'dra', schema: { tipo: 'CRF' }, rinforzatore: { descrizione: 'Pausa', qualita: 'alta' },
    parametri: { alternativoId: 'a', problema: 'rinforzo', schemaProblema: { tipo: 'FR', valore: 2 } } };
  assert.match(piano.descriviContingenza(dra, t), /“Chiede una pausa” con CRF · Pausa, alta preferenza; problema ancora rinforzato con FR 2/);
  assert.equal(piano.schemiConcorrenti({ contingenze: [dra] }), true);
  assert.equal(piano.schemiConcorrenti({ contingenze: [{ ...dra, parametri: { ...dra.parametri, problema: 'estinzione' } }] }), false);
  assert.equal(piano.descriviContingenza({ procedura: 'dro', parametri: { variante: 'momentaneo_fisso', intervalloSec: 30 } }), 'Momentaneo, fisso 30 s');
});

test('piano: avvisi su funzione, sostitutivo, estinzione e procedure restrittive', () => {
  const pr = {
    target: [{ id: 'p', nome: 'Colpire', ruolo: 'problema', funzione: { ipotesi: 'attenzione' } }],
    piano: { fasi: [{ id: 'f1', nome: 'Intervento', tipo: 'intervento', contingenze: [
      { procedura: 'estinzione', targetId: 'p', parametri: { variante: 'fuga' } },
      { procedura: 'timeout', targetId: 'p', parametri: { variante: 'non_esclusionario', durataSec: 60 } }
    ] }] }
  };
  const testi = piano.controlla(pr).map((a) => a.testo).join('\n');
  assert.match(testi, /non insegna un comportamento sostitutivo/);
  assert.match(testi, /la funzione ipotizzata è attenzione/);
  assert.match(testi, /procedura restrittiva/);
  pr.piano.fasi[0].contingenze[1].motivazione = 'DRA ed EXT senza effetto per 10 sessioni';
  assert.doesNotMatch(piano.controlla(pr).map((a) => a.testo).join('\n'), /procedura restrittiva/);
});

test('piano: il modello FCT crea baseline, FCT, assottigliamento e mantenimento', () => {
  const p = { id: 'p', nome: 'Colpire' }, a = { id: 'a', nome: 'Chiede una pausa' };
  let n = 0;
  const fasi = piano.creaFasi('fct', p, a, 'fuga', (x) => x + n++);
  assert.deepEqual(fasi.map((f) => f.tipo), ['baseline', 'intervento', 'assottigliamento', 'mantenimento']);
  const fct = fasi[1].contingenze;
  assert.equal(fct[0].parametri.alternativoId, 'a');
  assert.equal(fct[0].rinforzatore.categoria, 'pausa');
  assert.equal(fct[1].parametri.variante, 'fuga');
});

test('archivio: due fasi dello stesso tipo restano distinte e il criterio vale nella fase in corso', () => {
  const stato = datiFinti.genera('2026-10-13T12:00:00');
  const pz = stato.config.soggetti[0];
  const { programma, target } = archivio.targetDi(pz).find((x) => x.target.nome === 'Chiede una pausa');
  const prima = archivio.serie(stato, pz, programma, target, {});
  assert.equal(archivio.statoCriterio(programma, target, prima).raggiunto, true);
  // Nuova fase di assottigliamento: nessuna sessione ancora, il criterio riparte.
  const prossima = piano.prossimaFase(programma);
  assert.equal(prossima.tipo, 'assottigliamento');
  programma.fasi.push({ id: 'fa_nuova', tipo: prossima.tipo, inizio: '2026-10-13', pianoId: prossima.id });
  assert.equal(archivio.statoCriterio(programma, target, prima).consecutive, 0);
  assert.equal(archivio.nomeFaseCorrente(programma), 'Assottigliamento: schema multiplo');
  const s = archivio.apriSessione(stato, pz);
  assert.equal(s.fasiId[programma.id], 'fa_nuova');
});

test('piano: funzioni multiple e sintetizzate', () => {
  const t = { nome: 'Colpire', funzione: { ipotesi: 'fuga', altre: ['tangibile', 'fuga'], sintetizzata: true } };
  assert.deepEqual(piano.funzioniDi(t), ['fuga', 'tangibile']);
  assert.equal(piano.descriviFunzione(t), 'Fuga o evitamento + accesso a oggetti o attività, sintetizzate (IISCA)');
  assert.equal(piano.rinforzatoreFunzionale(['fuga', 'tangibile']).descrizione, 'Pausa dal compito con oggetto richiesto');
  // L'estinzione per il tangibile è coerente con una delle due funzioni.
  const pr = { target: [{ id: 'p', ruolo: 'problema', ...t }, { id: 'a', ruolo: 'sostitutivo', sostituisce: 'p', nome: 'Chiede' }],
    piano: { fasi: [{ id: 'f', nome: 'FCT', contingenze: [
      { procedura: 'fct', targetId: 'p', schema: { tipo: 'CRF' }, parametri: { alternativoId: 'a', problema: 'estinzione' } },
      { procedura: 'estinzione', targetId: 'p', parametri: { variante: 'tangibile' } }] }] } };
  assert.doesNotMatch(piano.controlla(pr).map((a) => a.testo).join('\n'), /funzione ipotizzata/);
});

test('piano: token con i tre schemi', () => {
  const prezzi = piano.leggiPrezzi('Tablet 2 min = 5\nriga sbagliata\nAdesivo=3');
  assert.deepEqual(prezzi, [{ descrizione: 'Tablet 2 min', costo: 5 }, { descrizione: 'Adesivo', costo: 3 }]);
  assert.equal(piano.scriviPrezzi(prezzi), 'Tablet 2 min = 5\nAdesivo = 3');
  const c = { procedura: 'token', schema: { tipo: 'FR', valore: 2 }, parametri: { tokenPerScambio: 5, prezzi } };
  assert.equal(piano.descriviContingenza(c), 'Un token con FR 2; scambio dopo 5 token; menu: Tablet 2 min 5, Adesivo 3');
  const pr = { target: [{ id: 'a', nome: 'Attenzione', ruolo: 'abilita' }], piano: { fasi: [{ id: 'f', nome: 'Token', contingenze: [{ ...c, targetId: 'a', parametri: { tokenPerScambio: 5 } }] }] } };
  assert.match(piano.controlla(pr).map((a) => a.testo).join('\n'), /prezzo di ogni rinforzatore/);
});
