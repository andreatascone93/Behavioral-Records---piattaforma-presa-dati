# Organizzazione della seduta

Richiesta di Andrea (13 ottobre 2026): oltre a registrare i dati, organizzare la seduta di lavoro. Esempio: una seduta di un’ora e mezza con un comportamento problema da ridurre e alcuni obiettivi in DTT, in cui servono momenti di raccolta dei primi dati, di training, di probe e di rilevazione dopo il training con un certo ritardo.

## Cosa fa l’app

**Sul desktop**, nella scheda *Schedule di seduta*, sotto le impostazioni e l’elenco dei target c’è la **scaletta della seduta**:

- la seduta si divide in **blocchi**, ognuno con tipo, nome, durata, target e una nota per l’operatore;
- una barra mostra la seduta in proporzione, con un colore per tipo di dato raccolto (probe, insegnamento, baseline, nessuna prova);
- **Per tutta la seduta**: i target che restano sempre sullo schermo, in ogni blocco (di solito comportamenti problema e misure continue);
- **Proponi una scaletta** costruisce una proposta dalla durata prevista e dai target (vedi sotto), poi si modifica a mano;
- i **controlli** avvisano se la somma dei blocchi non torna con la durata, se un target a prove discrete non è in nessun blocco, se il probe a freddo viene dopo l’insegnamento dello stesso target, se il probe ritardato arriva prima del ritardo previsto, se ci sono più di 30 minuti di insegnamento di fila.

**Sul telefono**, se il paziente ha una scaletta, la seduta la segue:

- in alto il **blocco in corso** con il tempo trascorso sul previsto; a tempo scaduto il riquadro cambia colore e il telefono vibra;
- **Passa a…** chiude il blocco e apre il successivo; **Scaletta** mostra tutti i blocchi con orari previsti e durata reale, e permette di saltare o tornare a un blocco;
- sotto, prima i target del blocco, poi quelli di tutta la seduta;
- nei **probe** la scheda DTT ha solo *Corretta* ed *Errore o nessuna risposta*, senza livelli di prompt; le prove contano nel blocco (es. 1 di 3). Se il blocco non prevede il rinforzo della risposta corretta, i tasti delle conseguenze programmate non compaiono;
- nel **probe ritardato** il telefono dice quanto manca al ritardo minimo dalla fine dell’ultimo blocco di insegnamento;
- nelle **pause**, se un comportamento problema ha ipotesi di funzione di fuga, il telefono ricorda di iniziare la pausa dopo una risposta alternativa o un periodo di lavoro, mai subito dopo un episodio.

Senza scaletta tutto resta come prima: tutti i target insieme.

## Tipi di blocco

| Tipo | Dati raccolti | A cosa serve |
| --- | --- | --- |
| Accoglienza e pairing | nessuna prova | Associare l’operatore ai rinforzatori, richieste facili |
| Valutazione breve delle preferenze | nessuna prova | Scegliere i rinforzatori del giorno (es. MSWO breve) |
| Probe a freddo | probe | Prime prove del target nella giornata, prima di insegnarlo, senza prompt |
| Baseline | baseline | Prove senza insegnamento per i target non ancora in trattamento |
| Insegnamento (DTT) | insegnamento | Prove con prompt e rinforzo, come da programma |
| Insegnamento naturale (NET) | insegnamento | Occasioni di insegnamento dentro il gioco e le routine |
| Probe di mantenimento e generalizzazione | probe | Prove senza prompt sui target già padroneggiati, anche con persone, materiali o luoghi nuovi |
| Pausa e accesso al rinforzo | nessuna prova | Accesso libero ai rinforzatori |
| Attività e gioco | nessuna prova | Attività mentre si misurano i target di tutta la seduta |
| Probe ritardato | probe | Verifica nella stessa seduta, dopo un intervallo dall’insegnamento, senza prompt |
| Chiusura | nessuna prova | Transizione, saluto, note per la famiglia |

Per ogni blocco di probe si sceglie se la risposta corretta riceve il rinforzo (*Rinforzo per la risposta corretta*) o se non c’è nessuna conseguenza: la rassegna nota che i programmi fanno entrambe le cose e che la scelta va dichiarata, perché cambia la misura.

## I dati: probe separati dall’insegnamento

Ogni evento registrato durante un blocco porta il **blocco** e il suo **contesto** (`probe`, `insegnamento`, `baseline`, `nessuno`). Il contesto del blocco vale solo per i target del blocco: un comportamento problema contato durante un probe resta `nessuno`. Gli eventi restano grezzi e immutabili come prima.

- **Grafici**: per i target a prove discrete con dati della scaletta compare la scelta *Tutte le prove · Solo probe · Solo insegnamento*. Sui probe la serie salta le sedute senza probe.
- **Criterio di padronanza**: nel target (e nei criteri per fase del piano) si può scegliere *Prove che contano: solo i probe della scaletta* o *solo le prove di insegnamento*. Con i probe contano solo le sedute che ne hanno; le altre non interrompono la serie. Si combina con livello di prompt, prima prova, operatori e setting.
- **Elenco di risposte** (obiettivi numerici): con il criterio sui probe, anche la padronanza di ogni risposta si valuta sui probe.
- **Fedeltà del trattamento**: le risposte dei probe (e le eventuali conseguenze date nei probe) restano fuori dal calcolo.
- **Sessioni**: il dettaglio di una seduta mostra la scaletta svolta con la durata reale di ogni blocco, quante volte è successo ogni comportamento contato in quel blocco e il tasso al minuto (la rassegna, sez. 5, suggerisce il tasso per blocco per capire dove si concentra il problema), e ogni prova dice se era di probe o di insegnamento.

## La proposta automatica

La rassegna della letteratura ([organizzazione-seduta-letteratura.md](organizzazione-seduta-letteratura.md)) è chiara su un punto: **nessuno studio fissa durate o percentuali** per training, probe e mantenimento dentro la seduta. Fissa invece alcuni vincoli, che la proposta rispetta e i controlli verificano:

- il probe a freddo di un target viene **prima** del suo insegnamento (Cummings & Carr, 2009; Lerman et al., 2011);
- il comportamento problema si misura **per tutta la seduta**, annotando il blocco (Carroll & Kodak, 2014);
- i dati di probe e di training restano **serie distinte**, e il criterio dichiara su quale si calcola;
- la verifica dopo il training ha tre scale: **stessa seduta** (il probe ritardato), **circa 24 ore** (il probe a freddo della seduta dopo), **settimane dopo la padronanza** (i probe di mantenimento).

Dalla durata prevista e dai target della seduta la proposta costruisce:

1. **Accoglienza** (5 minuti, al massimo il 10% della seduta).
2. **Valutazione breve delle preferenze** (5 minuti) dalle sedute di 60 minuti.
3. **Probe a freddo** dei target a prove discrete in trattamento: **3 prove per target** (le prime 3 prove seguono bene i dati continui, mentre la sola prima prova li anticipa e li sottostima: Lerman et al., 2011; Carey & Bourret, 2014), circa 1 minuto per target.
4. **Baseline** dei target il cui programma è ancora in baseline: 5 prove, circa 2 minuti per target.
5. **Insegnamento** in blocchi di al massimo 20 minuti separati da **pause** di 5 minuti; dalle sedute di 60 minuti, con almeno tre blocchi, quello centrale è in **NET**.
6. **Probe di mantenimento** dei target il cui programma è in mantenimento o generalizzazione (2 minuti per target, almeno 3).
7. **Probe ritardato** se ci sta, con **15 minuti** di ritardo (la rassegna propone "dopo il blocco successivo" o "dopo 15 minuti"): metà dei target (quelli insegnati per primi) si insegna solo nei blocchi che finiscono almeno 15 minuti prima del probe; nei blocchi successivi si lavora sugli altri. Se il ritardo non entra (sedute di 30 minuti, o un solo target), la verifica a distanza la fa il probe a freddo della seduta successiva, e la proposta lo dice.
8. **Chiusura** (5 minuti, al massimo il 10% della seduta).

I comportamenti e le misure continue (frequenza, durata, intervalli, campionamento momentaneo, IRT, ABC) vanno **per tutta la seduta**; DTT, task analysis e latenza vanno nei blocchi.

Esempio, seduta di 90 minuti con due target DTT (A e B) e un comportamento problema:

| Minuti | Blocco | Target |
| --- | --- | --- |
| 0–5 | Accoglienza e pairing | |
| 5–10 | Valutazione breve delle preferenze | |
| 10–12 | Probe a freddo, 3 prove | A, B |
| 12–26 | Insegnamento DTT 1 | A, B |
| 26–31 | Pausa | |
| 31–45 | Insegnamento DTT 2 | A, B |
| 45–50 | Pausa | |
| 50–64 | Insegnamento naturale (NET) | A, B |
| 64–69 | Pausa | |
| 69–83 | Insegnamento DTT 3 | B |
| 83–85 | Probe ritardato, 3 prove | A (19 minuti dopo il suo ultimo insegnamento) |
| 85–90 | Chiusura | |
| 0–90 | Comportamento problema | per tutta la seduta |

**Le durate restano convenzioni del software**, non risultati di ricerca: stanno in `PREDEFINITI` in `app/js/seduta.js`, ognuna con il suo appoggio nel commento quando c’è, e la scaletta di ogni paziente si modifica a mano. Anche le scelte che la rassegna dà come individuali (pratica concentrata o distribuita, ITI, rapporto di interspersal) restano al clinico.

## Modello dei dati

- `soggetto.schedule.blocchi`: `[{ id, tipo, nome, durataMin, targetIds, prove, ritardoMin, rinforzoProbe, nota }]`; `prove` vuoto = come da metodo; `ritardoMin` solo per il probe ritardato; `rinforzoProbe` solo per i blocchi di probe.
- `soggetto.schedule.continui`: id dei target di tutta la seduta.
- `sessione.scaletta`: copia dei blocchi all’apertura (così i nomi restano anche se poi la schedule cambia); `sessione.continui`; `sessione.blocchiSvolti`: `[{ bloccoId, inizio, fine }]`, un blocco può comparire più volte se si torna indietro.
- `evento.blocco`, `evento.contesto`.
- Calcoli in `app/js/seduta.js` (`proponi`, `verifica`, `passaA`, `valoriPerContesto`, `serieNelContesto`); `archivio.serie` aggiunge a ogni punto `perContesto: { probe, insegnamento, baseline }` quando gli eventi hanno un contesto; `criterio.contesto` in `modello.valoreCriterio`.
- Nessuna modifica allo schema del cloud: blocchi e scaletta viaggiano dentro i documenti `soggetto` e `sessione`, contesto e blocco dentro l’evento.

## Cosa resta fuori

Dalla sezione 8 della rassegna, non ancora nell’app:

- **più modelli di seduta per paziente** (es. "seduta lunga", "seduta a domicilio"): per ora una scaletta, da modificare prima della seduta;
- **calendario dei probe di mantenimento** (1, 2, 4 settimane dalla padronanza, poi mensile) con i target in scadenza inseriti da soli nel blocco di mantenimento e il ritorno in training se il probe va sotto criterio: oggi il blocco prende i target dei programmi in fase di mantenimento o generalizzazione;
- **parametri del training** nel blocco: formato (a blocchi, misto, interspersal), rapporto tra target padroneggiati e in acquisizione, ITI come promemoria; l’ITI medio misurato dagli orari delle prove;
- **probe e training sullo stesso grafico** con simboli diversi (oggi si sceglie quale serie vedere), tasso del comportamento problema **per tipo di blocco** sull’insieme delle sedute (oggi è per seduta, nel dettaglio), percentuale di tempo effettivo per tipo di blocco;
- per i probe, il livello di prompt che sarebbe servito;
- il riepilogo sul telefono non distingue ancora probe e insegnamento.
