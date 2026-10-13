# Organizzazione della seduta ABA: cosa dice la letteratura

Rapporto di ricerca per la piattaforma di presa dati ABA (behavioral-records). Data: 13/10/2026.

Domanda di partenza (Andrea): come organizzare una seduta di lavoro (per esempio 90 minuti) in cui convivono la riduzione di un comportamento problema e obiettivi di insegnamento in DTT, con momenti di raccolta dati iniziale, training, probe e verifiche dopo il training con un certo intervallo. Quanto tempo dedicare a ciascuna parte, e a quale distanza fare le verifiche.

Questo documento integra `docs/ricerca-letteratura.md` (che tratta target, piani, fasi, conseguenze e criteri di padronanza) senza ripeterlo. Il thread "Organizzazione della seduta" lo usa per costruire la funzione nell'app.

**Legenda di affidabilità** (la stessa di `docs/ricerca-letteratura.md`)
- **[V]** = verificato online in questa sessione (pagina dell'editore, ERIC, indice PubMed, repository istituzionale o elenco pubblicazioni dell'autore).
- **[V parziale]** = esistenza, titolo e rivista verificati; i risultati riportati vengono da un riassunto secondario o da memoria.
- **[M]** = citato da memoria, da verificare prima di usarlo in un documento clinico ufficiale.

Nota di metodo: in questa sessione PubMed Central e Crossref erano bloccati (reCAPTCHA / proxy) e PubMed ha limitato le richieste dopo poche consultazioni. Diversi risultati vengono quindi dagli abstract (ERIC, Springer, Nature) e non dal testo completo.

---

## 0. In breve: cosa la letteratura dice, e cosa non dice

**Cosa dice con buona solidità**
1. **La seduta si scompone in blocchi con funzioni diverse**: misura senza insegnamento (probe), insegnamento (training), mantenimento, generalizzazione, e misura continua del comportamento problema. È la struttura del manuale (Cooper, Heron & Heward, 2020) e dei protocolli EIBI. I dati di probe e i dati di training vanno tenuti distinti.
2. **I probe "a freddo" (prima prova del giorno, prima di insegnare) sono una misura economica ma meno sensibile** dei dati prova per prova: rivelano il miglioramento più tardi, sottostimano la prestazione e, con criteri su 2 sedute, portano a dichiarare padronanze premature. Con criteri su almeno 3 sedute e registrando il livello di prompt il problema si riduce (Lerman et al., 2011; Carey & Bourret, 2014; Cummings & Carr, 2009; Najdowski et al., 2009).
3. **Intervallo tra le prove breve** (circa 1–2 s) produce in genere più risposte corrette e meno autostimolazione che intervalli lunghi (Koegel, Dunlap & Dyer, 1980; Dunlap, Dyer & Koegel, 1983; Cariveau, Kodak & Campbell, 2016).
4. **Alternare compiti diversi e inserire compiti già padroneggiati** (task variation / interspersal) migliora risposte corrette, affetto e comportamento rispetto a ripetere lo stesso compito (Dunlap & Koegel, 1980; Bottini et al., 2018). Nessuna variante di interspersal è superiore alle altre in modo generale.
5. **Distribuire le prove nell'arco della giornata o della seduta (distributed practice) invece di concentrarle tutte in un blocco (massed)** ha effetti individuali: a volte più efficiente, a volte no (Haq & Kodak, 2015; Haq et al., 2015; Majdalany et al., 2014). Va trattato come una variabile da scegliere e confrontare per il singolo bambino.
6. **Il mantenimento va verificato con probe dopo la padronanza**, perché la prestazione al mantenimento tende a riflettere il livello del criterio usato (Pitts & Hoerger, 2021; Richling et al., 2019). Molti studi e molti clinici non lo fanno (McDougale et al., 2020).
7. **Il comportamento problema va misurato per tutta la seduta, non solo in alcuni blocchi**: misurare solo in parte della seduta, o interrompere la misura, può cambiare l'esito percepito del trattamento (Carroll & Kodak, 2014).
8. **L'intensità complessiva (ore) e la durata (mesi) predicono il numero di obiettivi raggiunti** (Linstead et al., 2017). Questo riguarda il monte ore settimanale, non la struttura interna della seduta.

**Cosa la letteratura NON dice**
- **Non esiste una percentuale raccomandata** di tempo da dedicare a training, probe e mantenimento dentro una seduta. Le cifre usate nei centri (per esempio "10% probe, 70% insegnamento, 20% gioco e pause") sono convenzioni cliniche, non risultati di ricerca.
- **Non esiste un ritardo unico "giusto" per la verifica dopo il training.** In pratica si usano tre scale temporali diverse, che rispondono a domande diverse (sezione 3): stessa seduta (dopo qualche prova o minuto), seduta successiva o giorno dopo (il probe a freddo, circa 24 ore), e settimane dopo la padronanza (mantenimento: 1, 2, 4 settimane o intervalli crescenti).
- **Non esiste una durata ottimale della seduta** dimostrata sperimentalmente per la DTT. Le sedute di ricerca durano spesso 5–15 minuti per programma; le sedute cliniche 1–3 ore, spezzate in blocchi.

Quindi l'app deve rendere la struttura **configurabile**, con valori predefiniti dichiarati come convenzioni del software, e deve **registrare la struttura effettivamente svolta** per poterla confrontare con i dati.

---

## 1. Anatomia di una seduta

### 1.1 I blocchi tipici

| Blocco | Funzione | Cosa si registra | Note dalla letteratura |
|---|---|---|---|
| **Accoglienza / pairing** | Stabilire il terapeuta e il setting come rinforzatori condizionati, valutare lo stato motivazionale | Eventuale comportamento problema; note | Prassi clinica (Sundberg & Partington, 1998 [M]). Nessuno studio fissa una durata. |
| **Valutazione breve delle preferenze** | Scegliere i rinforzatori del giorno | Scelte, ordine (es. MSWO breve) | Le preferenze cambiano nel tempo: valutazioni brevi e frequenti (giornaliere o prima della seduta) identificano rinforzatori più efficaci di una sola valutazione iniziale (DeLeon et al., 2001 [M]). Già trattato nella sezione 2.6 di `ricerca-letteratura.md`. |
| **Probe a freddo (cold probe)** | Misurare l'apprendimento senza l'effetto dell'insegnamento della seduta | Prima prova (o prime N prove) per target, senza prompt; corretto/errato/nessuna risposta | Sezione 2. Va fatto **prima** del training di quel target. |
| **Training (DTT)** | Insegnare i target in acquisizione | Prova per prova: risposta, livello di prompt, latenza se utile | ITI breve (sez. 4.1), interspersal (sez. 4.2), massed o distribuito (sez. 4.3). |
| **Insegnamento in contesto naturale (NET)** | Insegnare e generalizzare in situazioni di gioco, mand guidati dalla motivazione | Opportunità e risposte, livello di prompt | Spesso alternato alla DTT (Sundberg & Partington, 1998 [M]). |
| **Probe di mantenimento** | Verificare target già padroneggiati a distanza di tempo | Prove senza prompt sui target in mantenimento | Sezione 3.3. |
| **Probe di generalizzazione** | Verificare con altre persone, materiali, luoghi | Prove senza prompt in condizioni nuove | Stokes & Baer, 1977 (in `ricerca-letteratura.md`). |
| **Pause / tempo libero** | Ridurre l'affaticamento, rinforzare | Durata, se contingente o programmata | La pausa può essere il rinforzatore della fuga: se il comportamento problema ha funzione di fuga, la pausa deve essere contingente alla risposta alternativa o al lavoro, non al comportamento problema (vedi DRA e FCT in `ricerca-letteratura.md`). |
| **Chiusura** | Concludere con successo, transizione | Note | Prassi clinica. |
| **Comportamento problema** (trasversale) | Misura continua per tutta la seduta | Frequenza, durata o intervalli, con il blocco in cui avviene | Sezione 5. Non è un blocco: è una misura sempre attiva. |

### 1.2 Ordine dei blocchi

La letteratura fissa solo alcuni vincoli di ordine:
- **Il probe a freddo di un target precede il training di quello stesso target** nella stessa giornata, altrimenti misura l'effetto immediato dell'insegnamento e non l'apprendimento ritenuto (Cummings & Carr, 2009; Lerman et al., 2011).
- **Prima delle richieste difficili, una serie di richieste facili ad alta probabilità** (high-p sequence) aumenta l'adesione alla richiesta difficile (Mace et al., 1988 [M]). Nell'app esiste già l'alternanza di richieste facili sul telefono (PR #10).
- **Il probe di generalizzazione con un altro operatore** si fa idealmente senza che quell'operatore abbia insegnato il target in quella seduta.

Tutto il resto (quando mettere il NET, quante pause, dove mettere il mantenimento) è una scelta clinica.

### 1.3 Un esempio di seduta di 90 minuti (convenzione, non letteratura)

Esempio costruito a partire dai vincoli sopra, da usare come **modello predefinito modificabile** nell'app. Le durate sono convenzioni del software.

| Min. | Blocco | Contenuto |
|---|---|---|
| 0–5 | Accoglienza e pairing | Gioco con rinforzatori, richieste facili |
| 5–10 | Preferenze | MSWO breve con 5 oggetti (oppure scelta libera) |
| 10–20 | Probe a freddo | Prima prova senza prompt per ogni target in acquisizione (es. 6–8 target, 1–3 prove ciascuno) |
| 20–40 | Training DTT, blocco 1 | Target in acquisizione, interspersal con target padroneggiati, ITI breve |
| 40–45 | Pausa | Tempo libero con rinforzatori (contingente al lavoro) |
| 45–60 | NET | Mand e generalizzazione nel gioco |
| 60–75 | Training DTT, blocco 2 | Gli stessi o altri target (pratica distribuita) |
| 75–85 | Mantenimento e generalizzazione | Probe dei target in mantenimento scaduti oggi; un target con materiale nuovo |
| 85–90 | Chiusura | Attività preferita, transizione |
| 0–90 | Comportamento problema | Registrazione continua con il blocco corrente |

Con questo schema il tempo "di misura senza insegnamento" (probe a freddo, mantenimento, generalizzazione) è circa il 20–25% della seduta e l'insegnamento diretto (DTT + NET) circa il 55%. **Sono rapporti di esempio**: nessuno studio li indica come ottimali.

---

## 2. Probe a freddo e dati prova per prova

### 2.1 Che cos'è un probe a freddo

Una prova (o un piccolo numero di prove) presentata **all'inizio della giornata, prima di qualsiasi insegnamento di quel target**, senza prompt. Molti programmi forniscono rinforzo per la risposta corretta e nessun feedback per l'errore; altri non danno conseguenze. La scelta va dichiarata nel programma perché cambia la misura.

Lo scopo è stimare cosa il bambino sa fare "da solo, a distanza dall'ultima lezione" (di solito circa 24 ore, cioè dalla seduta precedente).

### 2.2 Cosa dicono gli studi di confronto

- **Cummings & Carr (2009)**: confronto tra registrazione continua (tutte le prove) e discontinua (prima prova) in un programma per bambini con autismo. Il riassunto secondario riporta che la prima prova identificava la padronanza un po' prima, mentre le abilità valutate con tutti i dati si mantenevano un po' meglio. [V parziale]
- **Najdowski et al. (2009)**, replica: nessuna differenza tra i due metodi né per la padronanza né per il mantenimento. [V parziale]
- **Lerman, Dittlinger, Fentress & Lanagan (2011)**, 11 bambini e 24 target [V]:
  - con criterio su 2 sedute, i dati della prima prova portavano spesso a padronanze premature; con 3 sedute il problema si riduceva;
  - i dati delle prime 3 prove coincidevano bene con i dati continui;
  - la prima prova mostrava un cambiamento in media dopo circa 8,6 sedute, i dati continui dopo circa 4,7;
  - registrare il livello di prompt rendeva più sensibili i dati discontinui;
  - raccomandazione degli autori: usare dati continui quando il costo non è il problema; altrimenti registrare un piccolo sottoinsieme di prove (non solo la prima), con il livello di prompt, e basare la padronanza su almeno 3 sedute.
- **Carey & Bourret (2014)**, dati d'archivio [V]:
  - campionare solo le prime 1, 3 o 5 prove **sottostima** sedute e giorni alla padronanza (la padronanza sembra arrivare prima) e sovrastima il tempo alla prima risposta indipendente;
  - registrare solo una seduta ogni 2, 3 o 5 **sovrastima** sedute e giorni alla padronanza;
  - il risparmio di tempo di registrazione era modesto.

### 2.3 Implicazioni pratiche

- Tenere **due serie di dati distinte** per ogni target: probe (senza prompt, a distanza) e training (prova per prova). Non mescolarle nello stesso valore di seduta.
- Permettere che il criterio di padronanza si calcoli **sui probe, sul training o su entrambi**, a scelta per programma. L'app lo fa già in parte con l'opzione "prima prova" del criterio (PR #9), che oggi prende la prima prova della prima seduta del giorno.
- Con criteri basati sui probe usare **almeno 3 sedute** consecutive (coerente con il 90% per 3 sedute scelto da Andrea).
- Per ogni probe registrare **anche il livello di prompt** che sarebbe servito, se si passa al training subito dopo.

---

## 3. Le verifiche dopo il training: tre scale temporali

La domanda di Andrea ("rilevazione di dati post training con un determinato delay") ha tre risposte diverse a seconda di cosa si vuole sapere.

### 3.1 Dentro la stessa seduta (minuti)

Domanda: il bambino risponde correttamente dopo qualche altra attività, senza prompt?

- È il principio della **pratica distribuita** e delle **prove intervallate** (interspersal): tra due presentazioni dello stesso target si inseriscono altri compiti o un intervallo di tempo.
- Gli studi su massed e distributed practice (sez. 4.3) confrontano proprio la distribuzione delle prove nella seduta o nella giornata. L'effetto è individuale.
- Nell'app: blocco "verifica" dopo un training, con un ritardo configurabile (es. "dopo il blocco successivo" o "dopo 15 minuti").

### 3.2 Alla seduta successiva (circa 24 ore)

Domanda: l'apprendimento si conserva da un giorno all'altro?

- È il **probe a freddo** della sezione 2. È lo standard di fatto nei programmi EIBI per decidere la padronanza.

### 3.3 Dopo la padronanza (settimane)

Domanda: il target padroneggiato si mantiene senza insegnamento?

- **Pitts & Hoerger (2021)** [V]: 4 bambini con autismo, criteri 80%, 90% e 100%; probe di mantenimento **1 settimana dopo la padronanza e poi ogni settimana per altre 3 settimane** (4 probe). La prestazione al mantenimento era simile al livello del criterio usato; il 100% dava il mantenimento migliore.
- **Richling, Williams & Carr (2019)** e **Fuller & Fienup (2018)**: criteri più alti producono un mantenimento migliore (già in `ricerca-letteratura.md`, sez. 1.8). [M]
- **McDougale, Richling, Longino & O'Rourke (2020)** [V]: molti studi non valutano il mantenimento e non descrivono il criterio in modo replicabile; i clinici usano accuratezze più basse su più osservazioni, i ricercatori accuratezze più alte su meno osservazioni.
- **Bottini, Gillis Mattson & Romanczyk (2023)** [V]: la ripetizione regolare di un'abilità già appresa, anche senza conseguenze, la manteneva quanto l'istruzione continua; gli autori raccomandano di **programmare probe di follow-up dei target padroneggiati dentro o tra le sedute**.
- **Distribuzione dei follow-up**: uno studio JABA del 2025, "Distribution of follow-up sessions influences determinations of skill maintenance" (PMID 40561356), mostra già dal titolo che **il calendario dei probe di mantenimento cambia la conclusione** sul mantenimento. Una ricerca collegata (Mattes, Western Michigan University, progetto SABA 2023) confronta follow-up a intervalli uguali e a intervalli progressivamente crescenti. [V parziale: titoli verificati, risultati non letti]
- **Dimensione del set e mantenimento**: uno studio del 2023 su *Behavior Analysis in Practice* (DOI 10.1007/s40617-023-00793-1) con set di 3, 6 e 12 parole: il set da 3 era il più rapido da acquisire, il set da 12 dava il mantenimento migliore a 30 giorni (circa 75% contro 42% e 8%). Gli autori avvertono che il set da 12 comportava più sovrapprendimento. [V, autori non letti]
- **Criteri per singolo target e "dosi" di prove**: Kim et al. (2023, JABA, DOI 10.1002/jaba.970): criteri di padronanza per singolo target con dosi di prove più piccole riducevano il tempo di acquisizione e miglioravano il mantenimento rispetto a criteri per seduta. [V parziale]

### 3.4 Calendario di mantenimento proposto (convenzione)

Nessuno studio fissa un calendario. Una proposta coerente con gli studi citati, da usare come predefinito modificabile:
- probe a **1, 2, 4 settimane** dalla padronanza, poi **mensile** (intervalli crescenti);
- se il probe scende sotto il criterio (es. sotto 80% o errato al primo tentativo), il target **torna in training** (nuova fase "ripresa") e l'app lo segnala;
- in alternativa un calendario a intervalli fissi (ogni settimana per 4 settimane, come Pitts & Hoerger, 2021).

---

## 4. Il training: parametri che contano

### 4.1 Intervallo tra le prove (ITI) e ritmo

- **Koegel, Dunlap & Dyer (1980)**, JABA 13(1), 91–99 [V]: intervalli brevi tra le prove hanno sempre prodotto più risposte corrette di intervalli lunghi.
- **Dunlap, Dyer & Koegel (1983)**, *American Journal of Mental Deficiency* 88(2), 194–202 [V]: intervalli brevi associati a più risposte corrette; l'autostimolazione tendeva ad aumentare con intervalli lunghi. [risultato sull'autostimolazione: M]
- **Cariveau, Kodak & Campbell (2016)**, JABA 49(4), 809–825 [V]: ITI corto (2 s), progressivo (da 2 a 20 s) e lungo (20 s), con formato massed o variato. L'ITI corto con formato variato era il più efficiente; il formato variato era più efficiente del massed per quasi tutti gli ITI. Le condizioni con meno stereotipie e miglior mantenimento differivano tra i partecipanti.
- **Roxburgh & Carbone (2013)**, *Behavior Modification* 37(3), 298–323: ritmo di presentazione più rapido con meno comportamento problema e più risposte. [M]
- **Wang (2022)**, tesi, University of Kansas [V]: l'ITI breve era il più efficace per due partecipanti.

Implicazione: l'ITI è un parametro del programma (predefinito "breve, 1–2 s"), e l'app può misurarlo dagli orari delle prove registrate.

### 4.2 Variazione dei compiti e interspersal

- **Dunlap & Koegel (1980)**, JABA 13, 619 ss., DOI 10.1901/jaba.1980.13-619 [V]: con lo stesso compito per tutta la seduta le risposte corrette calavano; alternando compiti diversi miglioravano e restavano stabili, e osservatori ignari giudicavano i bambini più interessati e più sereni.
- **Neef, Iwata & Page (1980)**: interspersal di item noti tra item nuovi migliora acquisizione e mantenimento. [M]
- **Volkert, Lerman, Trosclair, Addison & Kodak (2008)**, JABA 41, 335–350 [V]: analisi esplorativa dell'interspersal nell'insegnamento dei nomi di oggetti; effetti variabili tra bambini (l'interspersal non è sempre più efficiente perché "consuma" prove e rinforzatori). [risultati: M]
- **Bottini, Vetter, McArdell, Wiseman & Gillis (2018)**, meta-analisi, *Review Journal of Autism and Developmental Disorders* 5(2), 119–128 [V]: l'interspersal è efficace su molte abilità; nessuna variante procedurale è significativamente superiore alle altre.
- **McKeown et al. (2025)**, *Behavioral Interventions*, DOI 10.1002/bin.2071: prove a blocchi e prove miste producevano discriminazioni con velocità simile nei principianti. [V parziale]

Implicazione: nel blocco di training l'app deve permettere di scegliere il formato (a blocchi, misto, con interspersal) e il **rapporto tra target padroneggiati e in acquisizione** (es. 1:1, 1:3). Il rapporto non ha un valore ottimale in letteratura.

### 4.3 Pratica concentrata o distribuita

- **Haq & Kodak (2015)**, JABA 48(1), 85–95, DOI 10.1002/jaba.178 [V]: bambini a sviluppo tipico, tatti e lettura; confronto tra tutte le prove in una sola seduta (massed) e prove distribuite su più sedute.
- **Haq, Kodak, Kurtz-Nelson, Porritt, Rush & Cariveau (2015)**, JABA 48(2), 454–459, DOI 10.1002/jaba.213 [V]: replica con 3 bambini con autismo su tatti, lettura e intraverbali.
  - Risultato di entrambi, da memoria: la pratica distribuita era più efficiente per la maggior parte dei partecipanti, ma non per tutti. [M]
- **Majdalany, Wilder, Greif, Mathisen & Saini (2014)**, JABA 47(3), 657–662, DOI 10.1002/jaba.149 [V]: confronto tra prove concentrate, prove distribuite e interspersal per insegnare tatti. Risultato da memoria: le prove concentrate risultavano le più efficienti. [M]

Implicazione: con risultati discordanti, la scelta massed/distribuita va fatta per bambino. L'app può aiutare consentendo di dividere le prove di un target in più blocchi della seduta e confrontando le sedute.

### 4.4 Quanti target insieme e quante prove

- **Wunderlich, Vollmer, Donaldson & Phillips (2014)**, JABA 47(4), 723–737, DOI 10.1002/jaba.154 [V]: insegnamento seriale (un target alla volta fino alla padronanza) e concorrente (più target insieme). Nella replica di Wunderlich & Vollmer (2017) l'insegnamento concorrente era leggermente più rapido e la generalizzazione alta con entrambi. [V parziale]
- **Dimensione del set**: sez. 3.3 (set piccoli più rapidi, set grandi con più mantenimento).
- **Vladescu & Kodak (2013)**, JABA 46, 805–816, e **Nottingham, Vladescu & Kodak (2015)**, JABA 48, 227–232 [V]: aggiungere stimoli secondari nelle prove (instructive feedback) può far apprendere target in più senza allungare la seduta.
- **Numero di prove per target per seduta**: non c'è un valore stabilito. Nei programmi EIBI si usano spesso blocchi di 5–10 o 10–20 prove per target; Kim et al. (2023) suggeriscono che dosi piccole con criterio per singolo target possano essere più efficienti. [convenzione / V parziale]

### 4.5 Integrità del rinforzo nel training

- **Carroll, Kodak & Adolf (2016)**, JABA [V, numeri di volume e pagine non letti]: i ritardi nella consegna del rinforzo durante la DTT, trattati come errori di integrità, rallentano l'acquisizione.
- Implicazione: l'app registra già gli eventi con orario; la latenza tra risposta corretta e rinforzo è calcolabile e può entrare nella fedeltà del trattamento (`app/js/fedelta.js`, PR #9).

---

## 5. Il comportamento problema dentro la seduta di insegnamento

- **Misura continua per tutta la seduta**: Carroll & Kodak (2014), JABA 47, 264–276 [V], hanno confrontato la misura interrotta e non interrotta della stereotipia vocale. Interrompere la misura (per esempio misurare solo nei momenti senza istruzione) può cambiare l'esito percepito del trattamento. [risultato specifico: M]
- **Annotare il blocco** in cui avviene ogni episodio: il comportamento problema ha spesso tassi diversi in DTT, NET, pause e transizioni, e questo è informativo per l'ipotesi di funzione (per esempio più episodi nei blocchi di richieste fanno pensare alla fuga). È lo stesso principio della valutazione descrittiva con scatterplot (Touchette, MacDonald & Langer, 1985 [M]).
- **Tasso per blocco, non solo per seduta**: siccome i blocchi durano tempi diversi, il confronto tra blocchi va fatto come tasso (episodi al minuto o all'ora).
- **Coerenza col piano di intervento**: le conseguenze programmate (estinzione, DRA, FCT, pause contingenti) valgono in tutti i blocchi. Se un blocco (per esempio la pausa) viene dato dopo un episodio di comportamento problema con funzione di fuga, la struttura stessa della seduta rinforza il problema. L'app dovrebbe segnalarlo.

---

## 6. Intensità e durata complessive

- **Linstead, Dixon, Hong, Burns, French, Novack & Granpeesheh (2017)**, *Translational Psychiatry* 7(9), e1234, DOI 10.1038/tp.2017.207 [V]: 1.468 bambini; intensità (ore mensili per dominio) e durata (mesi) predicono il numero di obiettivi padroneggiati in tutti gli 8 domini, con effetti più forti per linguaggio e abilità accademiche.
- **Granpeesheh, Dixon, Tarbox, Kaplan & Wilke (2009)**, *Research in Autism Spectrum Disorders* 3(4), 1014–1022: relazione tra ore di trattamento e obiettivi raggiunti. [M]
- **Eldevik et al. (2009)**, meta-analisi EIBI, *Journal of Clinical Child & Adolescent Psychology* 38(3), 439–450. [M]
- **Linee guida CASP** (Council of Autism Service Providers). L'edizione 2020 (2ª) distingueva il trattamento **focalizzato** (circa 10–25 ore a settimana) dal **comprensivo** (circa 30–40 ore a settimana) [M]. La pagina ufficiale oggi cita l'edizione 2024 (*Applied behavior analysis practice guidelines for the treatment of Autism Spectrum Disorder*), il cui testo è dietro accordo di licenza [V per l'esistenza, contenuto non letto].

Queste fonti riguardano il **monte ore**, non come organizzare i minuti dentro la seduta.

---

## 7. Contesto sperimentale (per la versione Sperimentale)

Nella ricerca a soggetto singolo la seduta tende a essere **corta e standardizzata**: una condizione per seduta (o più condizioni nella stessa giornata in un disegno a trattamenti alternati), durata fissa (spesso 5–10 minuti per le analisi funzionali, un numero fisso di prove per i confronti di insegnamento), ordine delle condizioni randomizzato o controbilanciato, e un intervallo tra le sedute registrato. Gli studi sopra (Haq, Cariveau, Majdalany, Wunderlich) seguono proprio questo schema. Per la versione sperimentale l'app dovrà quindi:
- registrare la **condizione** di ogni seduta e l'**ordine** delle sedute nella giornata;
- consentire l'**ordine casuale o controbilanciato** delle condizioni;
- registrare il **tempo tra una seduta e l'altra** (rilevante per i confronti massed/distributed).

Fonti di metodo già in `ricerca-letteratura.md` (Ledford & Gast, 2018; Kratochwill et al., 2013).

---

## 8. Implicazioni per il modello dati e per l'app

Proposta per il thread "Organizzazione della seduta". Tutti i valori predefiniti indicati sono **convenzioni del software**, da mostrare come tali.

### 8.1 Modello di seduta (`SessionTemplate`)

- Per soggetto: nome, durata prevista (es. 90 min), elenco ordinato di **blocchi**.
- Più modelli per soggetto (es. "seduta lunga", "seduta a domicilio").

### 8.2 Blocco (`SessionBlock`)

- `tipo`: accoglienza/pairing, preferenze, probe a freddo, training DTT, NET, mantenimento, generalizzazione, pausa, chiusura, libero.
- `durataPrevista` (minuti) oppure `numeroProve` per target.
- `target`: elenco dei target inclusi, oppure "automatico" (es. tutti i target in acquisizione per il probe a freddo, tutti i target con mantenimento in scadenza oggi).
- Per i blocchi di training:
  - `formato`: a blocchi, misto, interspersal;
  - `rapportoInterspersal`: target padroneggiati per target in acquisizione (es. 1:3);
  - `itiSecondi`: predefinito 2 s, come promemoria per l'operatore (Cariveau et al., 2016).
- Per i blocchi di probe:
  - `conPrompt`: no;
  - `conseguenze`: rinforzo per corretta / nessuna conseguenza;
  - `proveProbe`: 1 o 3 (Lerman et al., 2011 suggeriscono più di una prova).
- `pausaContingente`: sì/no, con il comportamento che la ottiene.

### 8.3 Seduta svolta

- Ogni evento registrato porta il **blocco** in cui è avvenuto.
- Orari reali di inizio e fine di ogni blocco: confronto tra **previsto e svolto** (quanto tempo è andato davvero a probe, training, pause).
- I dati di **probe** e di **training** dello stesso target restano serie separate; il criterio di padronanza dichiara su quale serie si calcola.

### 8.4 Calendario dei probe di mantenimento

- Alla padronanza di un target l'app genera le **scadenze di mantenimento** (predefinito 1, 2, 4 settimane, poi mensile).
- I target in scadenza entrano automaticamente nel blocco "mantenimento" della seduta del giorno.
- Probe sotto criterio: proposta di ritorno in training (fase "ripresa").

### 8.5 Indicatori utili nei grafici e nel riepilogo

- Probe a freddo e training sullo stesso grafico, con simboli diversi.
- Tasso di comportamento problema **per tipo di blocco** (episodi/ora in DTT, NET, pause, transizioni).
- Percentuale di tempo effettivo per tipo di blocco nella seduta e nelle ultime sedute.
- ITI medio misurato e latenza del rinforzo (dagli orari degli eventi).
- Target con mantenimento in scadenza o non superato.

---

## Bibliografia

### Verificati in questa sessione [V]

- Bottini, S., Gillis Mattson, J., & Romanczyk, R. (2023). Retention during task interspersal versus varied instruction. *Journal of Behavioral Education, 32*(2), 362–381. https://doi.org/10.1007/s10864-021-09447-0
- Bottini, S., Vetter, J., McArdell, L., Wiseman, K., & Gillis, J. (2018). Task interspersal: A meta-analytic review of effective programming. *Review Journal of Autism and Developmental Disorders, 5*(2), 119–128. https://doi.org/10.1007/s40489-018-0127-7
- Carey, M. K., & Bourret, J. C. (2014). Effects of data sampling on graphical depictions of learning. *JABA, 47*(4), 749–764. https://doi.org/10.1002/jaba.153
- Cariveau, T., Kodak, T., & Campbell, V. (2016). The effects of intertrial interval and instructional format on skill acquisition and maintenance for children with autism spectrum disorders. *JABA, 49*(4), 809–825. https://doi.org/10.1002/jaba.322
- Carroll, R. A., & Kodak, T. (2014). An evaluation of interrupted and uninterrupted measurement of vocal stereotypy on perceived treatment outcomes. *JABA, 47*, 264–276. (DOI non letto)
- Carroll, R. A., Kodak, T., & Adolf, K. J. (2016). Effect of delayed reinforcement treatment integrity errors on skill acquisition during discrete trial instruction. *JABA*. (volume e pagine non letti)
- Dunlap, G., Dyer, K., & Koegel, R. L. (1983). Autistic self-stimulation and intertrial interval duration. *American Journal of Mental Deficiency, 88*(2), 194–202.
- Dunlap, G., & Koegel, R. L. (1980). Motivating autistic children through stimulus variation. *JABA, 13*(4), 619–627. https://doi.org/10.1901/jaba.1980.13-619 (pagine finali da memoria)
- Haq, S. S., & Kodak, T. (2015). Evaluating the effects of massed and distributed practice on acquisition and maintenance of tacts and textual behavior with typically developing children. *JABA, 48*(1), 85–95. https://doi.org/10.1002/jaba.178
- Haq, S. S., Kodak, T., Kurtz-Nelson, E., Porritt, M., Rush, K., & Cariveau, T. (2015). Comparing the effects of massed and distributed practice on skill acquisition for children with autism. *JABA, 48*(2), 454–459. https://doi.org/10.1002/jaba.213
- Kim, ... et al. (2023). Differential mastery criteria impact sight word acquisition and maintenance: Application to individual operants and teaching trial doses. *JABA*. https://doi.org/10.1002/jaba.970 (autori completi non letti)
- Koegel, R. L., Dunlap, G., & Dyer, K. (1980). Intertrial interval duration and learning in autistic children. *JABA, 13*(1), 91–99. https://doi.org/10.1901/jaba.1980.13-91
- Lerman, D. C., Dittlinger, L. H., Fentress, G., & Lanagan, T. (2011). A comparison of methods for collecting data on performance during discrete trial teaching. *Behavior Analysis in Practice, 4*(1), 53–62. https://doi.org/10.1007/BF03391775
- Linstead, E., Dixon, D. R., Hong, E., Burns, C. O., French, R., Novack, M. N., & Granpeesheh, D. (2017). An evaluation of the effects of intensity and duration on outcomes across treatment domains for children with autism spectrum disorder. *Translational Psychiatry, 7*(9), e1234. https://doi.org/10.1038/tp.2017.207
- Majdalany, L. M., Wilder, D. A., Greif, A., Mathisen, D., & Saini, V. (2014). Comparing massed-trial instruction, distributed-trial instruction, and task interspersal to teach tacts to children with autism spectrum disorders. *JABA, 47*(3), 657–662. https://doi.org/10.1002/jaba.149
- McDougale, C. B., Richling, S. M., Longino, E. B., & O'Rourke, S. A. (2020). Mastery criteria and maintenance: A descriptive analysis of applied research procedures. *Behavior Analysis in Practice, 13*(2), 402–410. https://doi.org/10.1007/s40617-019-00365-2
- McKeown, ... et al. (2025). Comparison of blocked versus mixed trialing when teaching foundational skills to early learners. *Behavioral Interventions*. https://doi.org/10.1002/bin.2071
- Najdowski, A. C., et al. (2009). Comparison of data-collection methods in a behavioral intervention program for children with pervasive developmental disorders: A replication. *JABA, 42*(4), 827–832. https://doi.org/10.1901/jaba.2009.42-827 (autori completi e pagine da memoria)
- Nottingham, C. L., Vladescu, J. C., & Kodak, T. M. (2015). Incorporating additional targets into learning trials for individuals with autism spectrum disorder. *JABA, 48*, 227–232.
- Pitts, L., & Hoerger, M. (2021). Mastery criteria and the maintenance of skills in children with developmental disabilities. *Behavioral Interventions, 36*(2), 522–531. https://doi.org/10.1002/bin.1778
- Studio sulla dimensione del set di stimoli (3, 6, 12 parole) (2023). *Behavior Analysis in Practice*. https://doi.org/10.1007/s40617-023-00793-1 (autori e titolo non letti)
- Studio sulla distribuzione dei follow-up (2025). Distribution of follow-up sessions influences determinations of skill maintenance. *JABA*. PMID 40561356 (autori e risultati non letti)
- Vladescu, J. C., & Kodak, T. (2013). Increasing instructional efficiency by presenting additional stimuli in learning trials for children with autism spectrum disorders. *JABA, 46*, 805–816.
- Volkert, V. M., Lerman, D. C., Trosclair, N., Addison, L., & Kodak, T. (2008). An exploratory analysis of task-interspersal procedures while teaching object labels to children with autism. *JABA, 41*, 335–350.
- Wang, Y. (2022). *The effects of variable intertrial interval duration on learning in children with autism* (tesi). University of Kansas.
- Wunderlich, K. L., Vollmer, T. R., Donaldson, J. M., & Phillips, C. L. (2014). Effects of serial and concurrent training on acquisition and generalization. *JABA, 47*(4), 723–737. https://doi.org/10.1002/jaba.154
- Council of Autism Service Providers (2024). *Applied behavior analysis practice guidelines for the treatment of Autism Spectrum Disorder*. https://www.casproviders.org/asd-guidelines (esistenza verificata, testo non letto)

### Citati da memoria, da verificare [M]

- Cummings, A. R., & Carr, J. E. (2009). Evaluating progress in behavioral programs for children with autism spectrum disorders via continuous and discontinuous measurement. *JABA, 42*(1), 57–71. https://doi.org/10.1901/jaba.2009.42-57
- DeLeon, I. G., Fisher, W. W., Rodriguez-Catter, V., Maglieri, K., Herman, K., & Marhefka, J.-M. (2001). Examination of relative reinforcement effects of stimuli identified through pretreatment and daily brief preference assessments. *JABA, 34*(4), 463–473. https://doi.org/10.1901/jaba.2001.34-463
- Eldevik, S., Hastings, R. P., Hughes, J. C., Jahr, E., Eikeseth, S., & Cross, S. (2009). Meta-analysis of early intensive behavioral intervention for children with autism. *Journal of Clinical Child & Adolescent Psychology, 38*(3), 439–450.
- Granpeesheh, D., Dixon, D. R., Tarbox, J., Kaplan, A. M., & Wilke, A. E. (2009). The effects of age and treatment intensity on behavioral intervention outcomes for children with autism spectrum disorders. *Research in Autism Spectrum Disorders, 3*(4), 1014–1022.
- Mace, F. C., Hock, M. L., Lalli, J. S., West, B. J., Belfiore, P., Pinter, E., & Brown, D. K. (1988). Behavioral momentum in the treatment of noncompliance. *JABA, 21*(2), 123–141. https://doi.org/10.1901/jaba.1988.21-123
- Neef, N. A., Iwata, B. A., & Page, T. J. (1980). The effects of interspersal training versus high-density reinforcement on spelling acquisition and retention. *JABA, 13*(1), 153–158. https://doi.org/10.1901/jaba.1980.13-153
- Roxburgh, C. A., & Carbone, V. J. (2013). The effect of varying teacher presentation rates on responding during discrete trial training for two children with autism. *Behavior Modification, 37*(3), 298–323.
- Sundberg, M. L., & Partington, J. W. (1998). *Teaching language to children with autism or other developmental disabilities*. Behavior Analysts, Inc.
- Touchette, P. E., MacDonald, R. F., & Langer, S. N. (1985). A scatter plot for identifying stimulus control of problem behavior. *JABA, 18*(4), 343–351. https://doi.org/10.1901/jaba.1985.18-343
- Wunderlich, K. L., & Vollmer, T. R. (2017). Effects of serial and concurrent training on receptive identification tasks: A systematic replication. *JABA, 50*(3), 641–652.
- Per Cooper, Heron & Heward (2020), Fuller & Fienup (2018), Richling et al. (2019), Stokes & Baer (1977), Ledford & Gast (2018), Kratochwill et al. (2013) vedi `docs/ricerca-letteratura.md`.
