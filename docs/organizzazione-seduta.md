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
- nei **probe** la scheda DTT ha solo *Corretta* ed *Errore o nessuna risposta*, senza livelli di prompt, e non mostra i tasti delle conseguenze programmate; le prove contano nel blocco (es. 1 di 1);
- nel **probe ritardato** il telefono dice quanto manca al ritardo minimo dalla fine dell’ultimo blocco di insegnamento.

Senza scaletta tutto resta come prima: tutti i target insieme.

## Tipi di blocco

| Tipo | Dati raccolti | A cosa serve |
| --- | --- | --- |
| Accoglienza e pairing | nessuna prova | Associare l’operatore ai rinforzatori, scegliere cosa guadagnare |
| Probe a freddo | probe | Prima presentazione del target, prima di insegnarlo: niente prompt, niente rinforzo differenziale |
| Baseline | baseline | Prove senza insegnamento per i target non ancora in trattamento |
| Insegnamento (DTT) | insegnamento | Prove con prompt e rinforzo, come da programma |
| Insegnamento naturale (NET) | insegnamento | Occasioni di insegnamento dentro il gioco e le routine |
| Mantenimento e generalizzazione | insegnamento | Richieste su risposte già acquisite, materiali e persone diversi |
| Pausa e accesso al rinforzo | nessuna prova | Accesso libero ai rinforzatori |
| Attività e gioco | nessuna prova | Attività mentre si misurano i target di tutta la seduta |
| Probe ritardato | probe | Ripresentazione dopo un intervallo dall’insegnamento, senza prompt |
| Chiusura | nessuna prova | Transizione, saluto, note per la famiglia |

## I dati: probe separati dall’insegnamento

Ogni evento registrato durante un blocco porta il **blocco** e il suo **contesto** (`probe`, `insegnamento`, `baseline`, `nessuno`). Il contesto del blocco vale solo per i target del blocco: un comportamento problema contato durante un probe resta `nessuno`. Gli eventi restano grezzi e immutabili come prima.

- **Grafici**: per i target a prove discrete con dati della scaletta compare la scelta *Tutte le prove · Solo probe · Solo insegnamento*. Sui probe la serie salta le sedute senza probe.
- **Criterio di padronanza**: nel target (e nei criteri per fase del piano) si può scegliere *Prove che contano: solo i probe della scaletta* o *solo le prove di insegnamento*. Con i probe contano solo le sedute che ne hanno; le altre non interrompono la serie. Si combina con livello di prompt, prima prova, operatori e setting.
- **Elenco di risposte** (obiettivi numerici): con il criterio sui probe, anche la padronanza di ogni risposta si valuta sui probe.
- **Fedeltà del trattamento**: le risposte dei probe non sono occasioni di rinforzo, quindi non contano come omissioni.
- **Sessioni**: il dettaglio di una seduta mostra la scaletta svolta con la durata reale di ogni blocco, e ogni prova dice se era di probe o di insegnamento.

## La proposta automatica

Dalla durata prevista e dai target della seduta:

1. **Accoglienza** (5 minuti, al massimo il 10% della seduta).
2. **Probe a freddo** dei target a prove discrete in trattamento: 1 prova per target, circa 1 minuto per target.
3. **Baseline** dei target a prove discrete il cui programma è ancora in baseline: 5 prove, circa 2 minuti per target.
4. **Insegnamento** in blocchi di al massimo 15 minuti separati da **pause** di 3 minuti.
5. **Mantenimento** (5 minuti) dalle sedute di 60 minuti in su.
6. **Probe ritardato** se ci sta: metà dei target (quelli insegnati per primi) si insegna solo nei blocchi che finiscono almeno 30 minuti prima del probe; nei blocchi successivi si lavora sugli altri. Se il ritardo non entra (es. sedute di 30 minuti, o un solo target), fa da probe ritardato il probe a freddo della seduta successiva, e la proposta lo dice.
7. **Chiusura** (3 minuti).

I comportamenti e le misure continue (frequenza, durata, intervalli, campionamento momentaneo, IRT, ABC) vanno **per tutta la seduta**; DTT, task analysis e latenza vanno nei blocchi.

Esempio, seduta di 90 minuti con due target DTT e un comportamento problema: accoglienza 5, probe a freddo 2, insegnamento 12, pausa 3, insegnamento 12, pausa 3, insegnamento 12, pausa 3, insegnamento 12 (solo il secondo target), pausa 3, insegnamento 13 (solo il secondo target), mantenimento 5 (solo il secondo target), probe ritardato 2 (primo target, 36 minuti dopo il suo ultimo insegnamento), chiusura 3; il comportamento problema si conta per tutti i 90 minuti.

**Questi valori sono convenzioni di partenza del software, non risultati della letteratura.** Stanno tutti in `PREDEFINITI` in `app/js/seduta.js` e si allineano alla rassegna sulla gestione della seduta (thread “Letteratura sulla gestione della seduta”) quando sarà disponibile. In ogni caso la scaletta di ogni paziente si modifica a mano.

## Modello dei dati

- `soggetto.schedule.blocchi`: `[{ id, tipo, nome, durataMin, targetIds, prove, ritardoMin, nota }]`; `prove` vuoto = come da metodo; `ritardoMin` solo per il probe ritardato.
- `soggetto.schedule.continui`: id dei target di tutta la seduta.
- `sessione.scaletta`: copia dei blocchi all’apertura (così i nomi restano anche se poi la schedule cambia); `sessione.continui`; `sessione.blocchiSvolti`: `[{ bloccoId, inizio, fine }]`, un blocco può comparire più volte se si torna indietro.
- `evento.blocco`, `evento.contesto`.
- Calcoli in `app/js/seduta.js` (`proponi`, `verifica`, `passaA`, `valoriPerContesto`, `serieNelContesto`); `archivio.serie` aggiunge a ogni punto `perContesto: { probe, insegnamento, baseline }` quando gli eventi hanno un contesto; `criterio.contesto` in `modello.valoreCriterio`.
- Nessuna modifica allo schema del cloud: blocchi e scaletta viaggiano dentro i documenti `soggetto` e `sessione`, contesto e blocco dentro l’evento.

## Cosa resta fuori

- Una sola scaletta per paziente: se servono sedute diverse (es. giorno di probe e giorno di training) per ora si modifica la scaletta prima della seduta.
- La proposta non tiene conto della difficoltà dei target, delle preferenze del giorno o dell’interspersione con rapporti precisi tra richieste facili e nuove (già gestita a parte nell’elenco di risposte).
- Il riepilogo sul telefono non distingue ancora probe e insegnamento.
