# Decisione tecnologica

Passo 4 del piano, 13 ottobre 2026. Raccomandazione e prima costruzione della versione vera, a partire dai prototipi clinici.

## In breve

- **Un'unica app web installabile (PWA)** per desktop e telefono: si apre dal browser, si installa sulla schermata Home o sul computer come un'app e funziona senza rete.
- **I dati vivono prima sul dispositivo** (IndexedDB, l'archivio del browser pensato per grandi quantità di dati) e poi vengono sincronizzati con il cloud.
- **Il cloud è Supabase** (database PostgreSQL gestito, con accesso degli operatori e regole di visibilità per riga), in una regione dell'Unione Europea.
- **Il codice resta JavaScript semplice senza dipendenze né passaggi di build**, lo stesso dei prototipi: il motore delle misure, il piano di intervento e i loro test passano tali e quali.

Senza un progetto Supabase collegato l'app funziona in **modalità locale**: tutto resta sul dispositivo, come nei prototipi. Collegare il cloud è un'impostazione, non una modifica del codice.

## Perché una PWA e non due app native

| Esigenza | Come la copre la PWA |
| --- | --- |
| Multipiattaforma (desktop per configurare e leggere i grafici, telefono per la seduta) | Lo stesso codice gira su Windows, macOS, Android e iPhone; nessun passaggio dagli store |
| Registrazione offline indispensabile | Il service worker conserva l'app sul dispositivo; ogni tocco è salvato subito nell'archivio locale |
| Schermo acceso durante la seduta, vibrazione | Wake Lock e vibrazione del browser (la vibrazione non c'è su iPhone) |
| Aggiornamenti | Si pubblica una volta, i dispositivi si aggiornano alla riapertura |
| Costo e manutenzione | Un solo codice, nessun account sviluppatore Apple o Google |

Limiti noti e via d'uscita: su iPhone i dati del browser possono essere cancellati dal sistema se l'app non è installata sulla schermata Home e non viene aperta per settimane, per questo l'app chiede l'archiviazione persistente e invita a installarla. Se in futuro serviranno funzioni che il browser non offre (timer in background a schermo spento, Bluetooth, notifiche affidabili su iPhone), la stessa app si può impacchettare come app nativa con Capacitor senza riscriverla.

## Perché niente framework, per ora

I prototipi contano circa 4.500 righe di JavaScript già provate da Andrea e coperte dai test. Riscriverle in React o simili costerebbe settimane senza aggiungere nulla che l'utente veda. Le restano tre vantaggi: si apre ovunque senza strumenti, chiunque può leggerne il codice, e il modello dei dati è lo stesso in Node (test) e nel browser. Si rivaluta se il gruppo di sviluppo cresce o se l'interfaccia diventa molto più complessa.

## Perché Supabase

| Esigenza | Supabase | Alternative considerate |
| --- | --- | --- |
| Dati relazionali e interrogabili (export per la ricerca, statistiche) | PostgreSQL vero | Firebase: database a documenti, interrogazioni limitate |
| Accesso per operatore e separazione tra studi | Utenti integrati e regole per riga nel database | Server proprio: tutto da scrivere e mantenere |
| GDPR | Regione UE (Francoforte), accordo sul trattamento dei dati disponibile | Server proprio: responsabilità tutta nostra |
| Costo iniziale | Piano gratuito sufficiente per prove e piccoli studi | — |
| Uscita | È PostgreSQL standard: si esporta e si sposta | Firebase: formato proprietario |

L'app parla con Supabase solo con richieste HTTP standard (nessuna libreria esterna da caricare), quindi cambiare fornitore significa riscrivere un solo file, `app/js/sincronizzazione.js`.

## Come funziona la sincronizzazione

Il principio del passo 1 resta: **si salva l'evento grezzo, non il risultato**.

- **Eventi**: non si modificano mai (una correzione è un nuovo evento "annulla"). Il server li accetta una sola volta per identificativo, quindi rimandarli è innocuo e due telefoni non vanno mai in conflitto.
- **Documenti** (un paziente con tutta la sua configurazione, una sessione, un operatore): hanno un numero di versione. Il dispositivo invia una modifica dicendo "parto dalla versione 7"; se nel frattempo qualcun altro ha salvato la 8, il server rifiuta, il dispositivo prende la versione del server e conserva la propria copia tra i **conflitti**, visibili nelle impostazioni del cloud.
- **Ricezione**: ogni riga del server ha un numero progressivo; il dispositivo chiede solo ciò che è arrivato dopo l'ultimo numero che ha visto.
- **Quando**: all'apertura, a ogni dato registrato se c'è rete, quando la rete torna, e ogni minuto mentre l'app è aperta.
- **Primo collegamento**: se il cloud è vuoto, il dispositivo vi carica i propri dati (anche quelli di esempio); se il cloud ha già dati, il dispositivo adotta quelli e invia solo le sedute registrate in locale.

Lo schema del database è in [`supabase/schema.sql`](../supabase/schema.sql): due tabelle (documenti ed eventi) più i membri dello studio, con le regole di visibilità per riga.

## Sicurezza e GDPR

Siamo ancora con dati inventati; prima dei dati reali serve un passo dedicato. Già pronto:

- il soggetto è identificato da un codice pseudonimo;
- ogni operatore accede con il proprio account e vede solo i dati del proprio studio (regole per riga nel database, non nell'app);
- i dati viaggiano cifrati (HTTPS) e sono cifrati sul server.

Da fare prima dei dati reali: valutazione d'impatto (DPIA), accordo sul trattamento con Supabase, informativa e consenso, registro dei trattamenti, politica di conservazione e cancellazione, cifratura dei dati sul dispositivo e blocco con codice dell'app.

## Pubblicazione

L'app è un insieme di file statici nella cartella `app/`: si pubblica su qualsiasi servizio di hosting statico. Il repository è privato, quindi GitHub Pages richiede un piano a pagamento; Cloudflare Pages e Netlify sono gratuiti anche con repository privati e si collegano a GitHub in pochi clic (cartella da pubblicare: `app`, nessun comando di build).

## Cosa serve da Andrea per accendere il cloud

1. Creare un progetto su [supabase.com](https://supabase.com) nella regione **Central EU (Frankfurt)**.
2. Nel progetto, aprire *SQL Editor*, incollare [`supabase/schema.sql`](../supabase/schema.sql) ed eseguirlo.
3. In *Authentication → Providers → Email*, disattivare le nuove iscrizioni libere; poi in *Authentication → Users* invitare gli operatori.
4. Associare ogni operatore allo studio con le righe indicate in fondo allo schema.
5. Copiare *Project URL* e *anon public key* (in *Project Settings → API*) in `app/config.js`, oppure inserirli dalle impostazioni del cloud nell'app.
6. Pubblicare la cartella `app` su Cloudflare Pages o Netlify.

I passi sono descritti nel dettaglio in [`supabase/LEGGIMI.md`](../supabase/LEGGIMI.md).
