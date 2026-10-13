# Behavioral Records

Piattaforma multipiattaforma per la registrazione dei dati dei programmi ABA, per uso clinico e sperimentale: si configura per paziente sul desktop, si registra in seduta sul telefono (anche senza rete), si leggono grafici e riepiloghi.

## Stato

| Passo | Contenuto | Dove |
| --- | --- | --- |
| 1. Modello dei dati e misure ABA | Entità, dieci misure standard, regole offline, differenze clinica/sperimentale | [docs/modello-dati.md](docs/modello-dati.md) |
| 2. Prototipo desktop | Pazienti, programmi, target, metodi di misura, schedule di seduta, grafici ABA | [app/desktop.html](app/desktop.html) |
| 3. Prototipo mobile | Seduta con gli strumenti di misura, salvataggio offline, riepilogo configurabile | [app/mobile.html](app/mobile.html) |
| Piano di intervento | Ruoli dei target, ipotesi di funzione, procedure di insegnamento, fasi pianificate con antecedenti e conseguenze (schemi di rinforzo, rinforzo differenziale, estinzione, schemi concorrenti), regole decisionali per fase, valutazione delle preferenze, timer DRO sul telefono, sicurezza e consenso | [docs/piano-intervento.md](docs/piano-intervento.md), [ricerca di letteratura](docs/ricerca-letteratura.md) |
| Obiettivi numerici e protocolli | Elenco di risposte nel target con obiettivo numerico (es. 25 tact), repertorio del paziente per operante e categoria, alternanza di richieste facili sul telefono, libreria VB-MAPP e manuali aggiunti | [docs/obiettivi-numerici.md](docs/obiettivi-numerici.md) |
| 4. Scelta tecnologica e versione vera | App web installabile (PWA) per desktop e telefono, dati sul dispositivo in IndexedDB, sincronizzazione con il cloud su Supabase, funzionamento offline | [docs/decisione-tecnologica.md](docs/decisione-tecnologica.md), [app/](app/), [supabase/](supabase/) |

L'app è la versione **clinica** con **dati di esempio**. Senza cloud collegato funziona in modalità locale: tutto resta nel browser e la sincronizzazione tra desktop e telefono aperti nello stesso browser è simulata. Con il cloud collegato le sedute passano davvero da un dispositivo all'altro. Non inserire dati reali di pazienti prima del passo dedicato al GDPR.

## Provare l'app

Online: <https://andreatascone93.github.io/Behavioral-Records---piattaforma-presa-dati/>. Il workflow `.github/workflows/pages.yml` ripubblica la cartella `app` su GitHub Pages a ogni push su `main`, dopo aver passato i test. Dal telefono basta aprire l'indirizzo e installare l'app sulla schermata Home.

In locale, con Node:

```sh
npm start        # serve la cartella app su http://localhost:3000
```

In alternativa si può aprire `app/index.html` con un doppio clic, ma così l'app non si installa e non funziona offline (il service worker richiede un indirizzo http o https).

Per collegare il cloud e pubblicare l'app: [supabase/LEGGIMI.md](supabase/LEGGIMI.md).

## Struttura

```
docs/modello-dati.md          modello dei dati e misure (passo 1)
docs/piano-intervento.md      target, piano a fasi e conseguenze programmate
docs/ricerca-letteratura.md   ricerca di letteratura su cui si basa il piano
docs/obiettivi-numerici.md    obiettivi numerici, repertorio e libreria dei protocolli
docs/decisione-tecnologica.md scelte tecniche e sincronizzazione (passo 4)
docs/design-esperienza-utente.md ricerca su design ed esperienza utente, con proposte per l'app
app/                          l'app, file statici senza passaggi di build
  index.html                  pagina di ingresso
  desktop.html, mobile.html   configurazione e grafici; seduta e riepilogo
  config.js                   indirizzo e chiave pubblica del cloud (facoltativi)
  manifest.webmanifest, sw.js installazione e funzionamento offline
  css/                        tema condiviso e stili delle due interfacce
  js/modello.js               tipi di misura, calcolo dei valori dagli eventi, criteri
  js/piano.js                 ruoli, funzioni, procedure, schemi di rinforzo, controlli del piano
  js/dati-finti.js            generatore deterministico dei dati di esempio
  js/deposito.js              archivio IndexedDB sul dispositivo
  js/archivio.js              dati in uso, consultazioni, registrazione
  js/sincronizzazione.js      motore di sincronizzazione e collegamento a Supabase
  js/cloud.js, cloud-ui.js    tempi della sincronizzazione e pannello Cloud
  js/pwa.js                   service worker e installazione
  js/grafico.js               grafici ABA in SVG
  js/desktop*.js, mobile.js   le due interfacce
supabase/schema.sql           tabelle, regole di accesso e funzioni del cloud
supabase/LEGGIMI.md           come accendere il cloud e pubblicare l'app
test/                         test del modello, della sincronizzazione e dello schema
```

Il codice è JavaScript semplice senza dipendenze, lo stesso nel browser e nei test. Il perché è in [docs/decisione-tecnologica.md](docs/decisione-tecnologica.md).

## Test

```sh
npm test
```

Il test dello schema del cloud avvia un PostgreSQL temporaneo se è installato (come sui server di GitHub Actions), altrimenti viene saltato.
