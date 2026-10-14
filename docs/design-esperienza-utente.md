# Design ed esperienza utente: riferimenti e cosa significano per Behavioral Records

Rapporto di ricerca per la piattaforma di presa dati ABA (behavioral-records). Data: 13/10/2026.

Domanda di partenza (Andrea): una ricerca in ambito graphic design e web design, con riferimenti su come ottimizzare al meglio l'esperienza utente della piattaforma.

Come è stato fatto: ho usato l'app pubblicata (versione di `main` al 13/10/2026, commit `be12312`) sul computer a 1440, 1024 e 768 px e sul telefono a 390 px, in tema chiaro e scuro, ho misurato contrasti, dimensioni dei pulsanti, proporzioni dei grafici e tempi di risposta al tocco, e ho cercato le fonti. Ogni raccomandazione è collegata a una fonte e a un punto preciso dell'app. Il codice in `app/` non è stato toccato: in questo momento lo sta cambiando il thread "Organizzazione della seduta". Le proposte della sezione 11 diventano lavoro sull'app quando quel thread ha finito.

**Legenda di affidabilità** (la stessa di `docs/ricerca-letteratura.md`)
- **[V]** = verificato online in questa sessione (pagina dell'autore, dell'editore o dell'ente che pubblica la norma).
- **[V parziale]** = esistenza, autori e rivista verificati; i risultati vengono da un riassunto secondario o dall'abstract.
- **[M]** = citato da memoria, da verificare prima di usarlo in un documento ufficiale.
- **[Misurato]** = numero rilevato sull'app con il browser automatico in questa sessione.
- **[Dedotto]** = mia conclusione, non scritta nella fonte.

Nota di metodo: PubMed Central chiedeva un controllo reCAPTCHA, quindi per gli articoli ABA ho letto abstract e schede secondarie, non il testo completo.

---

## 0. In breve: le dieci cose che contano di più

| # | Raccomandazione | Perché | Dove nell'app |
| --- | --- | --- | --- |
| 1 | **In seduta, i comportamenti da ridurre sempre a portata di pollice**, in una barra fissa in basso, senza dover scorrere | Il comportamento problema va registrato per tutta la seduta e compare quando vuole lui. Oggi la seduta di PZ-014 (6 target) è lunga circa 3,8 schermate [Misurato]: per contare un colpo bisogna prima trovare la carta giusta | Telefono, schermo della seduta |
| 2 | **Separare "leggere il piano" da "registrare"**: in seduta il piano della fase in una riga espandibile, non un riquadro sempre aperto | Divulgazione progressiva: in primo piano solo ciò che serve spesso (Nielsen, 2006 [V]). Oggi ogni carta mostra 3-4 righe di piano prima del tasto +1 [Misurato] | Telefono, carte dei target |
| 3 | **Conferma di ogni tocco che non dipenda dalla vibrazione** | Safari su iPhone non supporta la vibrazione dal web (MDN [V parziale]); su iPhone oggi il tocco ha solo il numero che cambia | Telefono, tutti i tasti di registrazione |
| 4 | **"Annulla" più grande, "Termina" meno in evidenza** | Annullare è meglio che chiedere conferma (Nielsen, 2018 [V]); le azioni irreversibili vanno tenute lontane dai tasti frequenti (Hoober, 2017 [V]). Oggi "Annulla ultimo" è alto 32 px e sta in cima alla carta, lontano dal +1; "Termina" è il pulsante blu pieno in alto [Misurato] | Telefono, testata e carte |
| 5 | **Bordi di campi e pulsanti secondari a contrasto 3:1** | WCAG 2.2, criterio 1.4.11 [V]. Oggi il bordo `--linea` ha contrasto 1,38:1 sul bianco [Misurato] | Tema condiviso (`tema.css`) |
| 6 | **Grafici più alti, stessa scala per misure uguali, ausili facoltativi per l'analisi visiva** | Proporzione standard 5:8 - 3:4 (Kubina et al., 2017 [V]); oggi 230:600, cioè circa 3:8 [Misurato]. L'accordo tra analisti visivi è in media .76 (Ninci et al., 2015 [V parziale]); le linee del dual-criterion portano l'accuratezza dal 55-71% al 94-95% dopo un breve addestramento (Fisher et al., 2003 [V parziale]) | Desktop, scheda Grafici |
| 7 | **Raggruppare le 8 schede del paziente** e far vedere quando la barra delle schede scorre | Ogni scelta in più rallenta la decisione (legge di Hick, raccolta in lawsofux.com [V]). A 768 px "Schedule di seduta" e "Sessioni" sono fuori schermo senza nessun indizio [Misurato] | Desktop, testata del paziente |
| 8 | **Una pagina "Decisioni da prendere"** con tutti i target a criterio, le fasi da cambiare e la fedeltà bassa, per tutti i pazienti | Prima la panoramica, poi i dettagli su richiesta (Shneiderman, 1996 [M]). Oggi l'avviso "Il criterio è raggiunto. Vuoi passare a..." si vede solo aprendo il grafico del singolo programma | Desktop, pagina iniziale |
| 9 | **Moduli di configurazione con validazione all'uscita dal campo e valori predefiniti** | La validazione in linea ha aumentato del 22% la riuscita e ridotto del 42% il tempo di compilazione (Wroblewski, 2009 [V]) | Desktop, schede Programmi e Piano |
| 10 | **Misurare con gli operatori**: sedute simulate, tempo ed errori di registrazione, SUS e NASA-TLX | Gli operatori hanno registrato con la stessa accuratezza su app e carta ma preferivano la carta (Pankewich et al., 2022 [V parziale]): l'adozione dipende da quanto l'app è comoda in seduta | Prima di usare l'app con pazienti veri |

---

## 1. Cosa funziona già

Prima delle proposte, cosa è già fatto bene e va conservato.

- **Carattere del testo**: Atkinson Hyperlegible, disegnato da Applied Design Works per il Braille Institute (2019, su Google Fonts dal 2021), con lettere volutamente diverse tra loro per chi vede poco [V]. È la scelta giusta per chi legge il telefono di sfuggita. Nel 2025 è uscita la versione "Next", con pesi variabili e una versione a spaziatura fissa [V] (vedi 6.1).
- **Numeri**: IBM Plex Mono con cifre tabulari (`tabular-nums`), virgola decimale italiana ("0,10"). Le cifre non ballano quando il contatore cambia.
- **Contrasto del testo**: tutte le coppie testo/fondo che ho misurato superano 4,5:1 in entrambi i temi [Misurato]. Testo secondario sul fondo 5,76:1 (chiaro) e 7,64:1 (scuro); testo delle pillole verde, arancio e rosso tra 4,78:1 e 5,38:1 nel tema chiaro, tra 6,86:1 e 7,66:1 nello scuro.
- **Tema scuro** con le stesse variabili e il rispetto di "riduci movimento" del sistema.
- **Telefono in seduta**:
  - tasto +1 alto 84 px, tasti dei livelli di prompt 58 px [Misurato], ben oltre i minimi (sezione 3.3);
  - schermo che resta acceso durante la seduta (Wake Lock), vibrazione dove esiste (Android);
  - "Annulla ultimo" e "Annulla ultima conseguenza";
  - conferma con pulsante che dice cosa fa ("Termina seduta"), come raccomanda Nielsen (2018) [V];
  - avviso "Offline: ogni tocco viene salvato sul telefono" in linguaggio semplice;
  - testo a 16 px, quindi iPhone non ingrandisce la pagina quando si tocca un campo (Safari lo fa sotto i 16 px [V]).
- **Tempi di risposta**: con il processore rallentato 4 volte (per simulare un telefono economico) un tocco su +1 si ridisegna in 76 ms di mediana e 112 ms al massimo [Misurato]. Sotto la soglia di 0,1 s della risposta che sembra istantanea (Nielsen, 1993 [V]) e sotto i 200 ms che Google considera buoni per l'INP [V].
- **Grafici**: inchiostro nero come nella tradizione dei grafici ABA, linee di cambio fase tratteggiate, dati non uniti attraverso il cambio di fase, etichette delle fasi, asse verticale che parte da zero, tabella dei valori come alternativa accessibile, punti raggiungibili da tastiera. Rispettano già la maggior parte degli standard di Kubina et al. (2017) (sezione 5.1).
- **Riepilogo sul telefono**: il colore della tendenza segue il significato clinico, non la direzione. "In calo" è verde per un comportamento da ridurre. È corretto, ma conviene dirlo in una legenda (sezione 5.4).
- **Schede del desktop** con i ruoli corretti per i lettori di schermo (`role="tab"`, `aria-selected`).

---

## 2. Principi generali e cosa significano qui

### 2.1 Le dieci euristiche di Nielsen

Pubblicate nel 1994, riviste nel 2024 [V]. Sono la lista di controllo più usata per valutare un'interfaccia senza utenti.

| Euristica | Cosa significa per questa app |
| --- | --- |
| 1. Visibilità dello stato del sistema | In seduta: orologio, rete, eventi ancora da inviare, timer DRO in corso. Ci sono già tutti; il numero di eventi da inviare però è una cifra senza parola accanto (sezione 3.6) |
| 2. Corrispondenza con il mondo reale | Il lessico ABA (FCT, CRF, EXT, DRO) è giusto per l'analista, meno per un tecnico alle prime armi: sigle con spiegazione a tocco (`<abbr>` o piccola finestra) |
| 3. Controllo e libertà | "Annulla ultimo" c'è; "‹" esce dalla seduta lasciandola aperta. Manca un modo per annullare un dato che non sia l'ultimo (per esempio dalla lista eventi della seduta) |
| 4. Coerenza e standard | Stessi nomi su desktop e telefono (oggi "Termina" sul pulsante e "Termina seduta" nella conferma: va bene, ma tenerlo come regola) |
| 5. Prevenzione degli errori | Non filtrare i doppi tocchi: in ABA i tocchi rapidi sono dati veri (alta frequenza). Meglio l'annulla visibile che il blocco |
| 6. Riconoscere invece di ricordare | Definizione operativa a un tocco dal tasto (c'è già); chip ABC con le categorie già scritte (c'è già) |
| 7. Flessibilità ed efficienza | Scorciatoie da tastiera sul desktop; "Parti da un modello" c'è già per le fasi, estenderlo a programmi interi |
| 8. Design estetico e minimale | In seduta solo ciò che serve a registrare (sezione 3.5) |
| 9. Riconoscere e correggere gli errori | Messaggi in italiano semplice che dicono cosa fare, non solo cosa è andato storto |
| 10. Aiuto e documentazione | Una pagina "Come si usa" e aiuti contestuali nei moduli del piano |

### 2.2 Leggi dell'esperienza utente utili qui

Dalla raccolta di Jon Yablonski, lawsofux.com [V per l'elenco; le descrizioni sono riassunti miei]:

- **Legge di Fitts**: il tempo per toccare un bersaglio cresce con la distanza e diminuisce con la grandezza. In seduta i tasti frequenti devono essere grandi e vicini al pollice.
- **Legge di Hick e sovraccarico di scelta**: più opzioni, decisione più lenta. Riguarda le 8 schede del desktop e le 6 voci di prompt per prova (che però sono necessarie: lì aiutano posizione fissa e lettere grandi).
- **Soglia di Doherty**: l'interazione resta fluida se il sistema risponde in meno di circa 400 ms [M per il valore].
- **Legge di Jakob**: le persone si aspettano che un'app funzioni come le altre che usano. Pulsante indietro in alto a sinistra, azione principale in basso o a destra.
- **Prossimità e regione comune** (Gestalt): ciò che sta vicino o nello stesso riquadro si legge come un gruppo. Utile per separare piano, registrazione e definizione dentro la carta.
- **Memoria di lavoro e chunking**: in seduta l'operatore tiene a mente il bambino, il compito e il dato; l'app non deve aggiungere cose da ricordare.
- **Legge di Tesler**: la complessità di un compito non sparisce, si sposta. La configurazione del piano è complessa per natura; va spostata sul desktop, a tavolino, perché il telefono in seduta resti semplice. È già la divisione dell'app.

### 2.3 Tempi di risposta

Tre soglie (Nielsen, 1993 [V]): 0,1 s sembra istantaneo, 1 s non interrompe il pensiero, oltre 10 s si perde l'attenzione. Per la registrazione in seduta conta solo la prima.

---

## 3. Il telefono in seduta

È la parte più delicata: è dove l'app compete con carta e penna, e dove un errore di progettazione diventa un dato sbagliato.

### 3.1 Il contesto: attenzione divisa

L'operatore insegna, osserva il bambino e registra nello stesso momento. Guarda il telefono per una frazione di secondo, spesso con una mano sola perché l'altra porge il materiale o blocca un colpo. [Dedotto dal compito; coerente con le ricerche sotto.]

Cosa dicono gli studi sulla registrazione elettronica in ABA:
- **Lotfizadeh et al. (2025)**, *Behavioral Interventions* [V parziale]: confrontando due app e la carta in sedute ABA, il metodo di registrazione non ha cambiato il numero di prove al minuto né la completezza dei dati; i partecipanti preferivano l'elettronico.
- **Pankewich et al. (2022)**, *Behavioral Interventions* [V parziale]: in un programma EIBI quattro operatori sono stati ugualmente accurati con carta e app, ma preferivano la carta. Gli autori concludono che l'accettabilità per il personale decide quanto facilmente si passa a uno strumento elettronico.
- **Kahng & Iwata (1998)**, *JABA*, rassegna dei sistemi computerizzati di registrazione in tempo reale [M].

Cosa significa: l'app deve essere **almeno veloce quanto la carta** nel gesto di registrare, e permettere di registrare **guardando poco**: posizioni fisse, bersagli grandi, conferma che si sente o si vede con la coda dell'occhio.

### 3.2 Come si tiene il telefono

- **Hoober (2013)**, UXmatters [V]: 1.333 osservazioni in luoghi pubblici, 780 persone che toccavano lo schermo. Una mano 49%, telefono tenuto con una mano e toccato con l'altra 36%, due mani 15%. Con una mano sola, pollice destro 67% e sinistro 33%. La presa cambia spesso, anche ogni pochi secondi. Le zone di raggiungibilità che aveva disegnato sono state poi ritirate dall'autore stesso (nota del 2017).
- **Hoober (2017)**, "Design for Fingers, Touch, and People", parte 3 [V]: la precisione del tocco è migliore al centro dello schermo (circa 7 mm) e peggiore negli angoli (circa 12 mm). Raccomandazioni: azioni principali nella metà o nei due terzi centrali; navigazione secondaria lungo i bordi alto o basso con poche voci; azioni irreversibili lontane da quelle frequenti; intere righe o riquadri toccabili, non solo l'etichetta.

Cosa significa:
- I tasti di registrazione nella fascia centrale e bassa, sempre nella stessa posizione.
- Un'opzione "mano sinistra" che specchia la disposizione (un terzo di chi usa una mano usa la sinistra).
- "Termina" e "Online/Offline" possono stare in alto (è una zona scomoda, quindi adatta ad azioni rare), ma non con lo stile più evidente.

### 3.3 Grandezza dei bersagli

| Fonte | Minimo indicato |
| --- | --- |
| WCAG 2.2, criterio 2.5.8 (livello AA) [V] | 24 × 24 px CSS, oppure spazio libero equivalente intorno |
| Apple, Human Interface Guidelines [V] | 44 × 44 pt |
| Google, accessibilità Android [V] | 48 × 48 dp, circa 9 mm, con almeno 8 dp tra un bersaglio e l'altro |
| Parhi, Karlson & Bederson (2006), MobileHCI [V] | 9,2 mm per tocchi singoli, 9,6 mm per tocchi in sequenza, con il pollice di una mano |
| Hoober (2017) [V] | progettare circa il 20% più grandi del necessario per ambienti difficili e vista ridotta |

Rilievo sull'app [Misurato], schermo della seduta:

| Elemento | Altezza oggi | Valutazione |
| --- | --- | --- |
| +1, Avvia episodio, Registra episodio, Corretta indipendente | 84 / 72 px | Ottimo |
| Livelli di prompt (V, G, M, FP, FT, ×) | 58 px | Ottimo |
| Chip ABC, "Conseguenza data", "Rinforzato per errore", elementi del target | 40 px | Passa le WCAG, sotto Apple e Google. Sono tocchi frequenti in seduta: portarli a 48 px |
| "Termina" | 42 px | Va bene come grandezza; è lo stile il problema (3.5) |
| "Online/Offline" | 36 px | Azione rara, va bene; meglio 44 |
| "Annulla ultimo" | 32 px, in cima alla carta | Troppo piccolo per un'azione che serve proprio quando si è sbagliato di fretta: almeno 44 px. Meglio non attaccarlo al +1, per non annullare un dato toccando di fretta (Hoober, 2017: azioni distruttive lontane da quelle frequenti) |

### 3.4 Conferma del tocco

- Apple chiede sempre uno stato "premuto" visibile nei pulsanti personalizzati, altrimenti il pulsante sembra non rispondere [V].
- La vibrazione dal web (`navigator.vibrate`) funziona su Chrome per Android ma non su Safari per iPhone: MDN la dà come "disponibilità limitata" e i dati di compatibilità di MDN e caniuse non la danno supportata su Safari [V parziale]. Su iPhone esiste solo un espediente (un interruttore nascosto, da Safari 17.4) di cui non mi fiderei [V parziale].
- Lo schermo sempre acceso (Screen Wake Lock) funziona su Safari da iOS 16.4; nelle app installate sulla schermata Home un errore lo bloccava fino a iOS 18.4 [V parziale, fonte: progressier.com con rimando al bug WebKit 254545].

Proposte:
- Un breve lampo del riquadro o del numero (150-200 ms) a ogni dato registrato, rispettando "riduci movimento".
- Un suono breve facoltativo, attivabile nelle impostazioni (utile anche con il telefono in tasca o sul tavolo). Va valutato con l'operatore: in alcune sedute il suono distrae il bambino. [Dedotto]
- Se iOS non garantisce lo schermo acceso, dirlo una volta all'avvio della seduta ("Su questo iPhone lo schermo può spegnersi: tocca lo schermo ogni tanto o allunga il blocco automatico"). [Dedotto]

### 3.5 Proposta: una "modalità registrazione"

Oggi la seduta è una lista di carte, una per target, ognuna con titolo, piano della fase, strumento e definizione. Con 6 target la pagina è lunga circa 3,8 schermate [Misurato]. Proposta di struttura, da provare con gli operatori:

1. **Barra fissa in basso con i comportamenti da ridurre** (contatori e durate), sempre visibile qualunque target si stia insegnando. Due o tre tasti grandi affiancati, con nome breve e conteggio. Collegamento con la letteratura sulla seduta: il comportamento problema va misurato per tutta la seduta, non solo in alcuni blocchi (Carroll & Kodak, 2014, citato in `docs/organizzazione-seduta-letteratura.md`).
2. **Al centro, un target di insegnamento alla volta** (la prova DTT in corso, la task analysis, l'intervallo), con "precedente / successivo" o un indice orizzontale dei target in alto. Così le posizioni dei tasti non cambiano mentre si lavora.
3. **Il piano della fase in una riga** ("FCT · CRF · EXT fuga"), che si apre al tocco. Le conseguenze da segnare ("Conseguenza data", "Rinforzato per errore") restano visibili come tasti.
4. **"Termina" con stile secondario** e conferma che resta com'è. Apple sconsiglia lo stile principale per le azioni distruttive, perché un pulsante molto in evidenza si tocca senza leggerlo [V]. Terminare non cancella dati, ma chiude la raccolta: un tocco per sbaglio, se confermato di fretta, interrompe la seduta [Dedotto].
5. **"Annulla ultimo" sempre nello stesso posto**, grande, con il nome del dato annullato nel messaggio ("Annullato: Colpire gli altri +1").

Questa proposta cambia la parte dell'app su cui lavora il thread "Organizzazione della seduta" (blocchi di rilevazione, training, probe). Va decisa insieme a quel lavoro, non sopra.

**Fatto il 14/10/2026, come opzione.** In seduta si sceglie la vista *Elenco* (quella di prima, predefinita) o *Un target alla volta*, che segue i punti 1-3 e 5 sopra, rispettando la scaletta in blocchi: blocco in corso in tre righe, indice dei target del blocco e di tutta la seduta, barra fissa con i comportamenti da ridurre misurati con un tocco (fino a 4), riga "Ultimo dato" con *Annulla* sopra i tasti della barra e quindi lontana dal +1. I target nascosti che aspettano una risposta (intervallo, DRO, DRL) hanno un punto nell'indice e compaiono in "Da segnare"; i loro timer continuano a vibrare. La scelta resta sul telefono, così si possono confrontare le due viste in seduta (prova suggerita nella sezione 10).

### 3.6 Senza rete

Linee guida di web.dev sull'esperienza offline (Kurtuldu & Steiner, 2016) [V]: dire subito in che stato è l'app e cosa si può ancora fare; sincronizzare appena torna la rete e mostrare se i dati sono sincronizzati; linguaggio semplice senza termini tecnici; non affidarsi solo al colore; non bloccare l'utente con finestre di attesa.

L'app fa già quasi tutto: avviso offline in parole semplici, numero di eventi in attesa accanto a "Offline", sincronizzazione al ritorno della rete. Due ritocchi:
- il numero in attesa è una cifra sola ("Offline 2") [Misurato]: meglio "2 da inviare", e oggi il lettore di schermo non lo legge perché l'etichetta accessibile del pulsante ("Rete: offline. Tocca per simulare il cambio.") sostituisce il contenuto;
- l'ora dell'ultimo invio riuscito si vede in fondo alla lista dei pazienti ("Cloud alle ...") ma non durante la seduta.

### 3.7 Meno tocchi dove i dati lo permettono

Registrare solo la prima prova della seduta porta a decisioni di padronanza simili a registrare tutte le prove (Cummings & Carr, 2009; replicato da Najdowski et al., 2009, *JABA* [V parziale]). La letteratura è già discussa in `docs/organizzazione-seduta-letteratura.md`; dal punto di vista dell'esperienza utente significa offrire, per i target in mantenimento, una registrazione "solo prima prova" con un solo tocco, così l'operatore registra di meno dove non serve.

---

## 4. Il desktop: configurare e leggere

### 4.1 Organizzazione delle schede

Oggi ogni paziente ha 8 schede: Grafici, Programmi e target, Repertorio, Protocolli, Piano di intervento, Preferenze, Schedule di seduta, Sessioni. A 768 px di larghezza le ultime due escono dallo schermo senza un indizio che la barra scorre [Misurato].

Proposte:
- Raggrupparle in tre aree, per esempio **Andamento** (Grafici, Sessioni), **Programma** (Programmi e target, Piano di intervento, Protocolli, Repertorio, Preferenze) e **Seduta** (Schedule). Il raggruppamento giusto si verifica con un card sorting con 3-5 colleghi [M per il metodo].
- Sotto i 900 px, un menu a tendina al posto della barra di schede, o almeno una sfumatura sul bordo che faccia capire che si scorre.
- Divulgazione progressiva su due livelli al massimo: più livelli confondono (Nielsen, 2006 [V]).

### 4.2 Prima la panoramica

"Prima la panoramica, poi zoom e filtri, poi i dettagli su richiesta" (Shneiderman, 1996 [M]). Proposta: una pagina iniziale **"Decisioni da prendere"** per tutti i pazienti, con:
- target a criterio da confermare ("Segna acquisita");
- fasi pronte per il passaggio ("Vuoi passare a ...?");
- fedeltà del trattamento sotto soglia nell'ultima seduta;
- sedute non sincronizzate da più di un giorno.

Ogni riga porta al grafico corrispondente. È il lavoro del lunedì mattina dell'analista, oggi sparso in tre pazienti e otto schede.

### 4.3 Moduli di configurazione

- **Quando validare** (Wroblewski, 2009, *A List Apart* [V]): 22 partecipanti, sei varianti dello stesso modulo. La validazione in linea migliore ha dato +22% di riuscita, -22% di errori, +31% di soddisfazione, -42% di tempo. Per le domande a cui si risponde con sicurezza (un nome, un numero di sessioni) conviene validare quando si esce dal campo; validare mentre si scrive solo per i campi con regole rigide. Non mettere segni di "ok" sui campi ovvi.
- **Una cosa per pagina** (GOV.UK Design System, pagine di domanda [V]): una domanda per pagina aiuta a capire cosa si chiede; serve sempre un "indietro" che non perda le risposte. È adatto a un percorso guidato "Nuovo programma" o "Nuovo paziente".
- Ma **non per il piano di intervento**: le procedure a passi funzionano male quando i passi dipendono l'uno dall'altro e bisogna tornare avanti e indietro (Nielsen, 2006 [V]). Il piano (funzione, comportamento sostitutivo, conseguenze, criteri) è fatto di parti che si influenzano: meglio una pagina unica con sezioni e un riepilogo che segnala ciò che manca (i controlli del piano esistono già in `piano.js`).
- **Valori predefiniti sensati**: il criterio 90% per 3 sessioni è già predefinito. Estendere a durata della seduta, setting e operatori, ripresi dall'ultimo valore usato.
- **Non chiedere due volte la stessa cosa** (WCAG 2.2, criterio 3.3.7 "Inserimento ridondante" [V]).
- **Etichette sopra i campi**, non a fianco: si leggono più in fretta [M, studi di eye tracking di Penzo, 2006].

### 4.4 Azioni distruttive

- "Ripristina dati di esempio" sta nella barra in alto, accanto a "Cloud" e "Apri il telefono" [Misurato]. Cancella le sedute registrate nel browser: va spostato in un menu di impostazioni o in fondo alla pagina. La conferma c'è già ed è scritta bene.
- Le conferme vanno usate poco, altrimenti si imparano a ignorare, e i pulsanti devono dire l'esito ("Elimina target", "Tieni") invece di "Sì / No" (Nielsen, 2018 [V]).

### 4.5 Tastiera e fuoco

- Dopo ogni tocco l'app ridisegna lo schermo e il fuoco torna all'inizio della pagina [Misurato: dopo un +1 il fuoco è su `body`]. Per chi usa la tastiera o un lettore di schermo vuol dire ripartire da capo a ogni dato. Va rimesso sul pulsante appena usato.
- WCAG 2.2, criterio 2.4.11 [V]: l'elemento che ha il fuoco non deve finire nascosto sotto barre fisse. Vale per la barra fissa proposta in 3.5.

---

## 5. Grafici

### 5.1 Standard di costruzione dei grafici ABA

**Kubina, Kostewicz, Brennan & King (2017)**, "A Critical Review of Line Graphs in Behavior Analytic Journals", *Educational Psychology Review* 29, 583-598 [V]. Hanno analizzato 4.313 grafici in 11 riviste: l'85% aveva almeno un errore. Confronto con i grafici dell'app [Misurato sul grafico di "Colpire gli altri"]:

| Standard | App oggi |
| --- | --- |
| Assi verticale e orizzontale disegnati | Sì |
| Asse verticale con una misura quantitativa | Sì ("risposte/min", "% indipendenti") |
| Asse orizzontale con un'unità di tempo | "Sessioni" (lo fa il 34% dei grafici pubblicati; lo standard preferisce il tempo). Proposta: opzione per mostrare le date |
| Proporzione verticale:orizzontale tra 5:8 e 3:4 | **No**: 230:600 ≈ 3:8. Grafici più schiacciati rendono meno visibile la pendenza [Dedotto]. Proposta: almeno 5:8 nella vista dettaglio, lasciando la vista compatta nel riepilogo |
| Tacche spaziate in modo uniforme e numerate | Sì sull'asse verticale; sull'orizzontale una sessione su due, poi l'ultima (va bene) |
| Punti e linea dei dati ben visibili | Sì |
| Linee di cambio fase ed etichette delle fasi | Sì |
| Dati non uniti attraverso il cambio di fase | Sì |
| Stessa scala per assi con la stessa unità | **No**: "Colpire gli altri" va da 0 a 1 risposte/min, "Chiede una pausa" da 0 a 0,6. Per confrontare comportamento problema e comportamento sostitutivo dello stesso programma serve la stessa scala |

### 5.2 Scala dell'asse verticale

**Dart & Radley (2017)**, *Journal of School Psychology* 63, 105-118 [V]: con un asse verticale più stretto gli esperti riconoscono peggio gli effetti del trattamento e tendono a sopravvalutarli. L'app parte già da zero; va mantenuto anche quando si aggiungeranno zoom o filtri.

### 5.3 Ausili per l'analisi visiva

- **Ninci, Vannest, Willson & Zhang (2015)**, *Behavior Modification* [V parziale]: meta-analisi di 19 articoli; l'accordo medio tra analisti visivi è .76, da basso ad appena adeguato.
- **Fisher, Kelley & Lomas (2003)**, *JABA* 36, 387-406 [V parziale]: il metodo "dual-criterion" e la sua versione prudente (CDC) proiettano nella fase di trattamento la media e la tendenza della baseline. Controllano i falsi positivi meglio del metodo split-middle; con un addestramento di 15 minuti l'accuratezza di 87 operatori è passata dal 71% al 95%.
- **Kratochwill et al. (2010)**, documentazione tecnica What Works Clearinghouse sui disegni a soggetto singolo [M]: sei aspetti da guardare (livello, tendenza, variabilità, immediatezza dell'effetto, sovrapposizione, coerenza tra fasi simili).

Proposta: un interruttore "Ausili" sul grafico che disegna le linee CDC della baseline e, a richiesta, la percentuale di punti oltre entrambe le linee. Spento per impostazione predefinita, perché il grafico pulito resta la vista principale.

### 5.4 Colore, forme e legenda

- Più serie nello stesso grafico (per esempio i livelli di prompt): distinguerle con **forme diverse dei punti**, non solo col colore (WCAG 2.2, criterio 1.4.1 [M]). Se serve il colore, la tavolozza **Okabe-Ito** (2008) è leggibile anche da chi distingue male i colori: arancio #E69F00, azzurro #56B4E9, verde-blu #009E73, giallo #F0E442, blu #0072B2, vermiglio #D55E00, porpora #CC79A7, nero #000000 [V parziale].
- Il riepilogo sul telefono colora la tendenza secondo il significato clinico ("In calo" in verde per un comportamento da ridurre). Aggiungere una legenda di una riga: "Verde = va nella direzione voluta".
- I minigrafici del riepilogo hanno un'area colorata sotto la linea: l'area suggerisce una quantità accumulata dal fondo del riquadro, che per un tasso o una percentuale non ha significato. Meglio la sola linea con l'ultimo punto evidenziato [Dedotto, in linea con il principio del rapporto dati-inchiostro di Tufte, 1983 M].
- Facoltativo, per chi lavora con il precision teaching: lo **Standard Celeration Chart** per le frequenze [M].

### 5.5 Riferimenti generali di visualizzazione

- Cleveland & McGill (1984): la posizione lungo una scala comune è il modo più preciso di confrontare quantità [M]. Conferma la scelta dei grafici a linee.
- Tufte, *The Visual Display of Quantitative Information* (1983, 2001) [M]; Few, *Information Dashboard Design* (2006, 2013) [M]; Cairo, *How Charts Lie* (2019) [M].

---

## 6. Graphic design

### 6.1 Tipografia

- Oggi tre famiglie: Bricolage Grotesque (titoli), Atkinson Hyperlegible (testo), IBM Plex Mono (dati). Atkinson Hyperlegible **Next** (2025) aggiunge pesi variabili e una versione a spaziatura fissa [V]: si potrebbe passare a due sole famiglie (Atkinson Next per testo e dati, Bricolage per i titoli), con lo stesso disegno delle cifre ovunque. Da provare sulle cifre tabulari prima di decidere.
- Una scala tipografica regolare (per esempio rapporto 1,25: 12, 15, 19, 23, 29 px) al posto delle misure libere attuali (0,72 / 0,75 / 0,78 / 0,8 / 0,82 / 0,85 / 0,88 rem convivono nei fogli di stile) [M per il metodo; Misurato per le misure].
- Righe di testo lungo tra 45 e 75 caratteri (Bringhurst, *The Elements of Typographic Style*) [M]. Le descrizioni del desktop sono già limitate in larghezza.
- **Caratteri ospitati sul proprio server**: oggi arrivano da Google Fonts. Il service worker li conserva per l'uso offline, ma il primo caricamento passa da Google. Un tribunale tedesco (LG München I, 20/01/2022) ha ritenuto contrario al GDPR il caricamento dinamico di Google Fonts senza consenso, per l'invio dell'indirizzo IP [M]. Per un'app clinica in Europa conviene servire i file dei caratteri dalla cartella dell'app (le licenze SIL OFL lo permettono). Va nel passo dedicato al GDPR.

### 6.2 Colore

- Il sistema attuale è chiaro: un colore d'azione (blu "penna"), tre colori di stato (bene, attenzione, critico) ciascuno con la versione tenue, testi sempre accompagnati da un pallino o da una parola. Va conservato.
- **Bordi**: `--linea` ha contrasto 1,38:1 su bianco e 1,26:1 sul fondo [Misurato]. Per campi e pulsanti secondari il bordo è l'unico segno che lì c'è un controllo, quindi deve arrivare a 3:1 (WCAG 2.2, criterio 1.4.11 [V]). Due strade: un bordo più scuro solo per i controlli (per esempio vicino a `--testo-2`), lasciando le linee dei riquadri chiare; oppure dare ai campi un fondo leggermente diverso dalla pagina.
- **Rosso e verde insieme**: circa un uomo su dodici distingue male rosso e verde [M]. L'app non usa mai solo il colore (le pillole hanno testo); tenerlo come regola.
- **Tema scuro**: fondo quasi nero ma non nero puro, colori schiariti e meno saturi, come raccomanda Material Design [M]. L'app lo fa già (#0e131a, blu #8fa3ff).

### 6.3 Spazi, griglia, forme

- Una griglia di spaziatura a multipli di 4 o 8 px [M] rende la pagina regolare senza pensarci. Oggi convivono valori in px e rem; vale la pena fissarli come variabili (`--spazio-1` ... `--spazio-6`) come già si fa per i colori.
- Arrotondamenti: due raggi nelle variabili (6 e 10 px) più le pillole, con qualche 12-14 px scritto a mano: portare anche questi nelle variabili.
- Ombre: una sola, leggera; tenerla.

### 6.4 Icone e testo nei pulsanti

Apple consiglia il testo quando un'etichetta breve è più chiara di un'icona, e di cominciare l'etichetta con un verbo [V]. L'app usa già etichette scritte ("Inizia seduta", "Avvia episodio"). Le icone servono per azioni ripetute e universali (indietro, chiudi, annulla), sempre con un'etichetta per i lettori di schermo.

### 6.5 Un piccolo sistema di design

Le variabili CSS di `tema.css` sono già un sistema di "design token". Proposta: una pagina interna (non pubblica) che mostra tutti i componenti (pulsanti, pillole, campi, carte, grafici) nei due temi, così ogni nuovo schermo parte da pezzi esistenti. Modelli da cui prendere spunto:
- **NHS digital service manual** (servizi sanitari inglesi, per pubblico e personale): sistema di design, guida ai contenuti, accessibilità [V].
- **GOV.UK Design System**, da cui deriva quello del NHS [V].
- **Designers Italia**: Design system .italia, Dev Kit Italia, modelli per le ASL, linee guida di design e di accessibilità per la pubblica amministrazione [V].
- **Material Design 3** e **Apple Human Interface Guidelines** per le convenzioni dei telefoni [V].

---

## 7. Accessibilità e norme

- **WCAG 2.2**, raccomandazione W3C dal 5 ottobre 2023 [V]. Nove criteri nuovi; quelli che toccano questa app: 2.5.8 grandezza dei bersagli (AA), 2.4.11 fuoco non nascosto (AA), 2.5.7 movimenti di trascinamento (AA: il riordino del riepilogo usa già i pulsanti ↑ ↓, bene), 3.3.7 inserimento ridondante (A). Obiettivo consigliato: livello AA.
- **European Accessibility Act** (Direttiva UE 2019/882) [V]: si applica dal 28 giugno 2025 a prodotti e servizi elencati (commercio elettronico, servizi bancari, trasporti, telecomunicazioni, libri elettronici, servizi audiovisivi). In Italia è recepito con il D.Lgs. 82/2022, l'autorità è AgID; le microimprese sono esentate per i servizi. [Dedotto] Uno strumento clinico per professionisti non è tra i servizi elencati, quindi probabilmente l'obbligo non si applica direttamente; se però la piattaforma venisse adottata da enti pubblici (per esempio una ASL), valgono la Legge Stanca (L. 4/2004) e le linee guida di accessibilità di AgID [M]. In entrambi i casi il riferimento tecnico sono le WCAG.
- Al di là degli obblighi: tra gli operatori ci sono persone con vista ridotta, daltonismo o difficoltà motorie, e in seduta tutti lavorano in condizioni di "disabilità temporanea" (una mano occupata, attenzione divisa).

Verifiche da fare: controllo automatico (axe o Lighthouse) a ogni modifica dell'interfaccia, e una prova a mano con VoiceOver su iPhone e TalkBack su Android sulla seduta.

---

## 8. Testi

- Italiano semplice, frasi brevi, verbo all'inizio dei pulsanti. L'app lo fa già in gran parte.
- Sigle ABA spiegate al tocco la prima volta (FCT, CRF, EXT, DRO, DRA, NET, IISCA).
- Messaggi di errore che dicono cosa fare ("Inserisci un numero tra 1 e 100"), non solo cosa non va.
- Stesse parole ovunque per le stesse cose: un piccolo glossario interno (seduta / sessione oggi convivono: "Inizia seduta" sul telefono, "Sessioni" come scheda e asse dei grafici) [Misurato]. Scegliere una parola sola.
- Riferimenti: la guida ai contenuti del NHS [V] e le linee guida di design di Designers Italia [V].

---

## 9. Prestazioni

- Soglie di Google per le Core Web Vitals, al 75° percentile delle visite [V]: caricamento del contenuto principale (LCP) entro 2,5 s, risposta all'interazione (INP) entro 200 ms, spostamenti della pagina (CLS) entro 0,1.
- Oggi la risposta al tocco va bene (76 ms di mediana con processore rallentato 4 volte, sezione 1). Però ogni tocco ridisegna l'intero schermo: con 15-20 target per seduta il tempo crescerà [Dedotto]. Quando si rifà lo schermo della seduta conviene aggiornare solo la carta toccata, cosa che risolve anche il problema del fuoco (4.5).
- Da misurare su un telefono Android economico vero, non solo simulato.

---

## 10. Come verificare con gli utenti

- **Progettazione centrata sull'utente** (ISO 9241-210:2019) [M]: capire il contesto, definire i requisiti, progettare, valutare con gli utenti, ripetere.
- **Test di usabilità a piccoli giri**: 5 persone per giro trovano gran parte dei problemi, meglio tre giri da 5 che uno da 15 (Nielsen, 2000) [M].
- **Prova in seduta simulata**: un collega fa il bambino seguendo un copione (per esempio 6 colpi, 2 richieste di pausa, un pianto di 40 s, 10 prove DTT), l'operatore registra con l'app; si confronta il registrato con il copione o con la videoregistrazione. È lo stesso ragionamento dell'accordo tra osservatori (IOA), familiare a chi fa ABA. Misure: errori di registrazione, tempo tra evento e tocco, dati mancati.
- **Questionari**:
  - **SUS** (System Usability Scale, Brooke; creato nel 1986, pubblicato nel 1996): 10 domande, punteggio medio di riferimento 68 su circa 500 studi; sopra 80,3 è nel 10% migliore [V].
  - **NASA-TLX** (Hart & Staveland, 1988): carico di lavoro su sei scale (mentale, fisico, temporale, prestazione, sforzo, frustrazione); la versione "Raw TLX" senza pesi è più veloce [V]. Adatto a confrontare carta e app durante la seduta.
  - **Validità sociale** in senso ABA: chiedere agli operatori se registrerebbero così ogni giorno e se preferiscono la carta (come in Pankewich et al., 2022).
- **Prima dell'uso con pazienti veri**, insieme al passo GDPR.

---

## 11. Proposta di lavoro sull'app

Ordinata per rapporto tra beneficio e sforzo. S = piccolo, M = medio, L = grande. Le voci segnate con ⚠ toccano lo schermo della seduta su cui lavora il thread "Organizzazione della seduta" e vanno fatte dopo o insieme a quel lavoro.

| # | Cosa | Dove | Sforzo | Fonte |
| --- | --- | --- | --- | --- |
| 1 | Bordi dei controlli a contrasto 3:1 | `tema.css` | S | WCAG 1.4.11 |
| 2 | Chip, "Conseguenza data" e "Annulla ultimo" a 48 px | `mobile.css` | S | Apple, Google, Parhi 2006 |
| 3 | "Termina" con stile secondario ⚠ | `mobile.js` | S | Apple HIG, Hoober 2017 |
| 4 | Indizio di scorrimento o menu per le schede sotto i 900 px | `desktop.css` | S | misura a 768 px |
| 5 | Grafici in proporzione 5:8 nella vista dettaglio | `grafico.js` | S | Kubina et al. 2017 |
| 6 | Stessa scala verticale per i target con la stessa misura nello stesso programma | `grafico.js`, `desktop.js` | S | Kubina et al. 2017 |
| 7 | "Ripristina dati di esempio" fuori dalla barra principale | `desktop.html` | S | Nielsen 2018 |
| 8 | Legenda del colore delle tendenze nel riepilogo; minigrafici senza area | `mobile.js`, `grafico.js` | S | Tufte |
| 9 | Fuoco rimesso sul pulsante dopo ogni tocco ⚠ | `mobile.js` | S | WCAG 2.4.3 |
| 10 | Una parola sola tra "seduta" e "sessione" | testi | S | coerenza |
| 11 | Lampo visivo a ogni dato e suono facoltativo; avviso schermo su iPhone ⚠ | `mobile.js` | M | MDN, Apple HIG |
| 12 | Modalità registrazione: barra fissa dei comportamenti da ridurre, un target alla volta, piano in una riga ⚠ | `mobile.js`, `mobile.css` | M-L | Hoober 2013 e 2017, Nielsen 2006 |
| 13 | Opzione mano sinistra ⚠ | `mobile.css` | S, dopo la 12 | Hoober 2013 |
| 14 | Ausili CDC sui grafici | `grafico.js` | M | Fisher et al. 2003, Ninci et al. 2015 |
| 15 | Pagina "Decisioni da prendere" | `desktop.js` | M | Shneiderman 1996 |
| 16 | Schede raggruppate in tre aree | `desktop.js` | M | Hick, Nielsen 2006 |
| 17 | Validazione all'uscita dal campo e valori predefiniti nei moduli | `desktop*.js` | M | Wroblewski 2009 |
| 18 | Caratteri ospitati nell'app | `app/`, `sw.js` | S | GDPR (passo dedicato) |
| 19 | Scala tipografica e spaziature come variabili | CSS | M | sistema di design |
| 20 | Prova con operatori in seduta simulata, SUS e NASA-TLX | fuori dal codice | L | sezione 10 |

**Stato al 14/10/2026.** Fatti nell'app: 1 (nuova variabile `--bordo-controllo`, 3,19:1 o più su tutti i fondi in entrambi i temi), 2 e 3 (tutti i pulsanti del telefono almeno 44 px, chip, scelte e conseguenze 48 px; "Termina" con stile secondario), 4 (le schede vanno a capo invece di scorrere: a 1024 px ne restavano nascoste tre), 5 (proporzione 5:8, al massimo 360 px di altezza su una colonna), 6, 7 (il pulsante è in fondo all'elenco dei pazienti), 8, 9 (anche sul desktop), 11 in parte (lampo sulla carta registrata; il numero di dati da inviare è anche nell'avviso offline e nell'etichetta per i lettori di schermo; il messaggio di annullamento nomina il target), 12 come opzione (vedi 3.5). "Annulla ultimo" resta in cima alla carta per il motivo scritto in 3.3. In più i riquadri aperti (definizione, piano di crisi, piano della fase) restano aperti dopo ogni tocco. Non fatti: 10 (serve scegliere la parola), il suono facoltativo e l'avviso sullo schermo di iPhone, 13-20.

---

## 12. Bibliografia

### Verificate online in questa sessione [V]

- Apple. Human Interface Guidelines, *Buttons* (aggiornato al 16/12/2025). https://developer.apple.com/design/human-interface-guidelines/buttons
- Dart, E. H., & Radley, K. C. (2017). The impact of ordinate scaling on the visual analysis of single-case data. *Journal of School Psychology, 63*, 105-118. https://aquila.usm.edu/fac_pubs/15218
- Google. Android Accessibility Help, *Touch target size*. https://support.google.com/accessibility/android/answer/7101858
- GOV.UK Design System. *Question pages*. https://design-system.service.gov.uk/patterns/question-pages/
- Hart, S. G., & Staveland, L. E. (1988). Development of NASA-TLX. In *Human Mental Workload*. Scheda: https://en.wikipedia.org/wiki/NASA-TLX
- Hoober, S. (2013). How do users really hold mobile devices? *UXmatters*. https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php
- Hoober, S. (2017). Design for fingers, touch, and people, part 3. *UXmatters*. https://www.uxmatters.com/mt/archives/2017/07/design-for-fingers-touch-and-people-part-3.php
- Kubina, R. M., Kostewicz, D. E., Brennan, K. M., & King, S. A. (2017). A critical review of line graphs in behavior analytic journals. *Educational Psychology Review, 29*, 583-598. https://centralreach.com/wp-content/uploads/2019/04/2017-Kubina-Kostewicz-Brennan-and-King.pdf
- Kurtuldu, M., & Steiner, T. (2016). Offline UX design guidelines. *web.dev*. https://web.dev/articles/offline-ux-design-guidelines
- MeasuringU. *System Usability Scale (SUS)*. https://measuringu.com/sus/
- NHS. *Digital service manual*. https://service-manual.nhs.uk/
- Nielsen, J. (1993). Response times: the 3 important limits. *Nielsen Norman Group*. https://www.nngroup.com/articles/response-times-3-important-limits/
- Nielsen, J. (1994, rivisto 2024). 10 usability heuristics for user interface design. *Nielsen Norman Group*. https://www.nngroup.com/articles/ten-usability-heuristics/
- Nielsen, J. (2006). Progressive disclosure. *Nielsen Norman Group*. https://www.nngroup.com/articles/progressive-disclosure/
- Nielsen, J. (2018). Confirmation dialogs can prevent user errors (if not overused). *Nielsen Norman Group*. https://www.nngroup.com/articles/confirmation-dialog/
- Parhi, P., Karlson, A. K., & Bederson, B. B. (2006). Target size study for one-handed thumb use on small touchscreen devices. *MobileHCI 2006*. https://doi.org/10.1145/1152215.1152260
- *Designers Italia* (Design system .italia, Dev Kit Italia, modelli ASL, linee guida di design e di accessibilità). https://designers.italia.it/
- Strahl, R. (2023). Preventing iOS textbox auto zooming and viewport sizing. https://weblog.west-wind.com/posts/2023/Apr/17/Preventing-iOS-Textbox-Auto-Zooming-and-ViewPort-Sizing
- Università di Padova, Centro Diritti Umani. *The European Accessibility Act (EAA): Directive (EU) 2019/882 and its implementation in Italy*. https://unipd-centrodirittiumani.it/en/topics/the-european-accessibility-act-eaa-directive-eu-2019882-and-its-implementation-in-italy
- W3C. *What's new in WCAG 2.2*. https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/
- W3C. *Understanding SC 2.5.8 Target Size (Minimum)*. https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- W3C. *Understanding SC 1.4.11 Non-text Contrast*. https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
- Web Vitals, soglie di LCP, INP e CLS. https://specification.website/spec/performance/core-web-vitals/
- Wikipedia. *Atkinson Hyperlegible* (storia, caratteristiche, versione Next del 2025). https://en.wikipedia.org/wiki/Atkinson_Hyperlegible
- Wroblewski, L. (2009). Inline validation in web forms. *A List Apart*. https://alistapart.com/article/inline-validation-in-web-forms/
- Yablonski, J. *Laws of UX*. https://lawsofux.com/

### Parzialmente verificate [V parziale]

- Cummings, A. R., & Carr, J. E. (2009). Evaluating progress in behavioral programs for children with autism spectrum disorders via continuous and discontinuous measurement. *JABA, 42*(1), 57-71. (Pagine da memoria; risultati dalla replica di Najdowski.)
- Fisher, W. W., Kelley, M. E., & Lomas, J. E. (2003). Visual aids and structured criteria for improving visual inspection and interpretation of single-case designs. *JABA, 36*(3), 387-406. https://doi.org/10.1901/jaba.2003.36-387 (risultati da una scheda secondaria)
- Lotfizadeh, A. D., et al. (2025). Confronto tra registrazione elettronica e carta in sedute ABA. *Behavioral Interventions*. https://doi.org/10.1002/bin.70013 (titolo esatto non letto)
- MDN Web Docs. *Navigator: vibrate()*. https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate (la tabella di compatibilità non si è caricata; il mancato supporto su Safari viene dai dati citati nella discussione https://github.com/mdn/browser-compat-data/issues/29166)
- Najdowski, A. C., et al. (2009). Comparison of data-collection methods in a behavioral intervention program for children with pervasive developmental disorders: a replication. *JABA, 42*(4), 827-832. https://doi.org/10.1901/jaba.2009.42-827
- Ninci, J., Vannest, K. J., Willson, V., & Zhang, N. (2015). Interrater agreement between visual analysts of single-case data: a meta-analysis. *Behavior Modification, 39*(4), 510-541. https://doi.org/10.1177/0145445515581327 (volume e pagine da memoria)
- Okabe, M., & Ito, K. (2008). Color Universal Design (CUD): how to make figures and presentations that are friendly to colorblind people. Codici dei colori da https://conceptviz.app/blog/okabe-ito-palette-hex-codes-complete-reference
- Pankewich, et al. (2022). Accuracy and acceptability of eHealth data collection for an early intensive behavioral intervention program. *Behavioral Interventions*. https://doi.org/10.1002/bin.1841 (ultima parola del titolo e secondi autori da completare)
- Progressier. *Screen Wake Lock* su iOS. https://progressier.com/pwa-capabilities/screen-wake-lock (con il bug WebKit https://webkit.org/b/254545)

### Citate da memoria [M]

- Bringhurst, R. *The Elements of Typographic Style* (4ª ed., 2012). Hartley & Marks.
- Cairo, A. (2019). *How Charts Lie*. Norton.
- Carroll, R. A., & Kodak, T. (2014). An evaluation of interrupted and uninterrupted measurement of vocal stereotypy on perceived treatment outcomes. *JABA, 47*(2), 264-276. (Già in `docs/organizzazione-seduta-letteratura.md`.)
- Cleveland, W. S., & McGill, R. (1984). Graphical perception: theory, experimentation, and application to the development of graphical methods. *Journal of the American Statistical Association, 79*(387), 531-554.
- Few, S. (2013). *Information Dashboard Design* (2ª ed.). Analytics Press.
- ISO 9241-210:2019. Ergonomia dell'interazione uomo-sistema: progettazione centrata sull'uomo per i sistemi interattivi.
- Kahng, S., & Iwata, B. A. (1998). Computerized systems for collecting real-time observational data. *JABA, 31*(2), 253-261.
- Kratochwill, T. R., Hitchcock, J., Horner, R. H., Levin, J. R., Odom, S. L., Rindskopf, D. M., & Shadish, W. R. (2010). *Single-case designs technical documentation*. What Works Clearinghouse.
- Krug, S. (2014). *Don't Make Me Think, Revisited* (3ª ed.). New Riders.
- Landgericht München I, sentenza del 20/01/2022, 3 O 17493/20 (Google Fonts e GDPR).
- Legge 9 gennaio 2004, n. 4 (Legge Stanca) e Linee guida AgID sull'accessibilità degli strumenti informatici.
- Lidwell, W., Holden, K., & Butler, J. (2010). *Universal Principles of Design* (2ª ed.). Rockport.
- Material Design 3, linee guida sul tema scuro. https://m3.material.io/
- Nielsen, J. (2000). Why you only need to test with 5 users. *Nielsen Norman Group*.
- Norman, D. A. (2013). *The Design of Everyday Things* (ed. rivista). Basic Books.
- Penzo, M. (2006). Label placement in forms. *UXmatters*.
- Shneiderman, B. (1996). The eyes have it: a task by data type taxonomy for information visualizations. *IEEE Symposium on Visual Languages*, 336-343.
- Tufte, E. R. (2001). *The Visual Display of Quantitative Information* (2ª ed.). Graphics Press.
- Wathan, A., & Schoger, S. (2018). *Refactoring UI*. (Guida pratica al graphic design di interfacce per sviluppatori.)
- Wroblewski, L. (2008). *Web Form Design: Filling in the Blanks*. Rosenfeld Media.
