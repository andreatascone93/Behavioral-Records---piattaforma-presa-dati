# Obiettivi numerici, repertorio e protocolli

13 ottobre 2026. Risponde alla richiesta di inserire obiettivi tipo VB-MAPP ("25 tact", "25 intraverbali di completamento", "25 LRFFC"), di tenere le risposte già apprese per categoria e di avere in app i programmi dei manuali.

## Elenco di risposte nel target

Un target con misura **Prove discrete (DTT)** può insegnare un elenco di risposte (scheda del target, riquadro "Elenco di risposte e obiettivo numerico"):

- **Operante**: mand, tact, ecoico, intraverbale, ascoltatore, LRFFC, imitazione, abbinamento, testuale, altro.
- **Obiettivo**: numero di risposte acquisite da raggiungere (es. 25). Contano tutte le risposte acquisite di quell'operante, comprese quelle già presenti nel repertorio, oppure solo quelle acquisite nel target.
- **Risposte**: una per riga, con la categoria prima dei due punti (`animali: mucca`). Le virgole restano nella risposta, così i completamenti intraverbali ("uno, due, …") si scrivono come sono.
- **Stato di ogni risposta**: in coda, in insegnamento, acquisita. Ne restano in insegnamento insieme quante indicate (predefinito 3); quando una diventa acquisita entra la prima in coda.
- **Padronanza per risposta**: si applica il criterio del target (predefinito 90% di risposte indipendenti per 3 sessioni consecutive) alle sole prove di quella risposta, dalle sessioni da quando è in insegnamento. Quando è raggiunto, il grafico propone "Segna acquisita". Con poche prove per risposta a seduta il dato è fragile: conviene almeno 3 prove per risposta.

## Repertorio e alternanza

La scheda **Repertorio** del paziente raccoglie per operante e categoria le risposte già presenti (inserite a mano, es. dalla valutazione iniziale) e quelle acquisite nei target.

Sul telefono, nei target con elenco, l'app indica quale risposta presentare: le risposte in insegnamento ruotano e, con l'alternanza attiva, dopo ogni N prove di training (predefinito 1) arriva una **richiesta facile** su una risposta già acquisita dello stesso operante. L'operatore può scegliere a mano un'altra risposta. Le richieste facili:

- si registrano come prove con `mantenimento: true` e non entrano nella percentuale del target né nel criterio;
- compaiono nel grafico come "richieste facili corrette su totali";
- se una risposta acquisita ha 2 o più errori nelle ultime 5 sedute viene segnalata **da ripassare**.

L'alternanza di compiti già acquisiti e compiti nuovi (interspersal) è descritta in letteratura come utile per acquisizione e motivazione (Neef, Iwata & Page, 1980 [M]). Il rapporto 1:1 è il predefinito del software, non una regola della letteratura.

## Libreria dei protocolli

La scheda **Protocolli** contiene:

- **VB-MAPP** (Sundberg, 2008): 170 milestone in 16 aree su 3 livelli, 5 per area e livello, numerate di seguito nell'area (livello 2 = 6-10). Per il diritto d'autore ci sono solo aree, livelli, codici e una descrizione breve e nostra di ogni area: descrizione e quantità di ogni milestone si completano con "Completa" dalla propria copia del manuale. La numerazione va verificata sulla copia.
- **Manuali aggiunti**: "Aggiungi un manuale" accetta voci nel formato `codice; area; livello; descrizione; quantità; operante`, per ABLLS-R, EFL, PEAK o i programmi del centro, sempre con parole proprie.

"Crea obiettivo" da una milestone crea (in un programma nuovo o esistente) un target DTT con elenco di risposte, obiettivo numerico, procedura di partenza per operante (istruzione, materiali, correzione) e riferimento alla milestone. Le personalizzazioni e i manuali aggiunti stanno in `stato.config.protocolli` e si sincronizzano come documenti di tipo `protocollo`.

## Cosa resta fuori

- Punteggi della valutazione VB-MAPP (0, ½, 1 per milestone), barriere e transizione.
- Sondaggi a freddo per singola risposta separati dalle sedute di training (oggi si usa il criterio "prima prova del giorno", applicato anche alla singola risposta).
- Riepilogo sul telefono dell'obiettivo numerico.
