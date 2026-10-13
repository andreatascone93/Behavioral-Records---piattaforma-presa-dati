# Behavioral Records

Piattaforma multipiattaforma per la registrazione dei dati dei programmi ABA, per uso clinico e sperimentale: si configura per paziente sul desktop, si registra in seduta sul telefono (anche senza rete), si leggono grafici e riepiloghi.

## Stato

| Passo | Contenuto | Dove |
| --- | --- | --- |
| 1. Modello dei dati e misure ABA | Entità, dieci misure standard, regole offline, differenze clinica/sperimentale | [docs/modello-dati.md](docs/modello-dati.md) |
| 2. Prototipo desktop | Pazienti, programmi, target, metodi di misura, schedule di seduta, grafici ABA | [prototipo/desktop.html](prototipo/desktop.html) |
| 3. Prototipo mobile | Seduta con gli strumenti di misura, salvataggio offline, riepilogo configurabile | [prototipo/mobile.html](prototipo/mobile.html) |
| Piano di intervento | Ruoli dei target, ipotesi di funzione, procedure di insegnamento, fasi pianificate con antecedenti e conseguenze (schemi di rinforzo, rinforzo differenziale, estinzione, schemi concorrenti), regole decisionali per fase, valutazione delle preferenze, timer DRO sul telefono, sicurezza e consenso | [docs/piano-intervento.md](docs/piano-intervento.md), [ricerca di letteratura](docs/ricerca-letteratura.md) |
| 4. Revisione e scelta tecnologica | Da fare insieme dopo aver provato i prototipi | – |

I prototipi sono la versione **clinica** con **dati inventati**. La sincronizzazione con il server è simulata: tutto resta nel browser.

## Provare i prototipi

Senza installare nulla: apri `prototipo/index.html` nel browser (doppio clic). In alternativa, con Node:

```sh
npm start        # serve la cartella prototipo su http://localhost:3000
```

Per vedere i dati passare dal telefono al desktop, apri `mobile.html` e `desktop.html` nello stesso browser, in due schede.

## Struttura

```
docs/modello-dati.md       modello dei dati e misure (passo 1)
docs/piano-intervento.md   target, piano a fasi e conseguenze programmate
docs/ricerca-letteratura.md ricerca di letteratura su cui si basa il piano
prototipo/
  index.html               pagina di ingresso
  desktop.html             configurazione e grafici
  mobile.html              seduta e riepilogo
  css/                     tema condiviso e stili delle due app
  js/modello.js            tipi di misura, calcolo dei valori dagli eventi, criteri
  js/piano.js              ruoli, funzioni, procedure, schemi di rinforzo, controlli del piano
  js/desktop-piano.js      scheda Piano di intervento del desktop
  js/desktop-preferenze.js scheda Preferenze del desktop
  js/dati-finti.js         generatore deterministico dei dati di esempio
  js/archivio.js           archivio locale, consultazioni, sincronizzazione simulata
  js/grafico.js            grafici ABA in SVG
  js/desktop.js, mobile.js le due interfacce
test/                      test del modello (node --test)
```

Il codice è JavaScript semplice senza dipendenze né passaggi di build, così i prototipi si aprono ovunque. La scelta dello stack per la versione vera è il passo 4.

## Test

```sh
npm test
```
