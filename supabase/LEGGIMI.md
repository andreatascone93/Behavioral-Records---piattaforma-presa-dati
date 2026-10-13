# Accendere il cloud

Guida passo passo per collegare l'app a un database cloud su Supabase e pubblicarla in rete. Servono circa venti minuti e nessuna conoscenza di programmazione. Finché non si fa, l'app funziona lo stesso in modalità locale: i dati restano sul dispositivo.

Il perché di queste scelte è in [docs/decisione-tecnologica.md](../docs/decisione-tecnologica.md).

## 1. Creare il progetto Supabase

1. Registrarsi su [supabase.com](https://supabase.com) (piano gratuito).
2. *New project*: nome a piacere (per esempio `behavioral-records`), una password del database lunga da conservare in un posto sicuro, regione **Central EU (Frankfurt)**.
3. Attendere un paio di minuti che il progetto sia pronto.

## 2. Creare le tabelle

1. Nel menu a sinistra aprire **SQL Editor** → *New query*.
2. Incollare tutto il contenuto di [`schema.sql`](schema.sql) e premere **Run**. Deve finire con "Success. No rows returned".

Rieseguirlo più avanti, quando lo schema cambia, è innocuo.

## 3. Chiudere le iscrizioni e invitare gli operatori

1. **Authentication → Sign In / Providers → Email**: lasciare attivo l'accesso con email e disattivare **Allow new users to sign up**. Così solo chi viene invitato può entrare.
2. **Authentication → Users → Add user → Send invitation** (oppure *Create new user* con una password provvisoria) per ogni operatore, Andrea compreso.

## 4. Creare lo studio e associare gli operatori

Nel **SQL Editor**, sostituendo nome dello studio ed email:

```sql
insert into public.studi (id, nome) values ('studio1', 'Il mio studio')
  on conflict (id) do nothing;

insert into public.membri (utente, studio_id, operatore_id, ruolo)
select id, 'studio1', 'op_andrea', 'supervisore' from auth.users where email = 'andrea@esempio.it'
on conflict (utente) do nothing;
```

`operatore_id` collega l'account all'operatore dell'app. Nei dati di esempio gli operatori sono `op_andrea`, `op_giulia` e `op_marco`; per un operatore nuovo si sceglie un identificativo nuovo (per esempio `op_sara`) e lo si aggiunge anche tra gli operatori dell'app.

Un account che non è in `membri` può entrare ma non vede né invia nulla: l'app lo dice con il messaggio "Questo account non è ancora associato a uno studio".

## 5. Dare all'app indirizzo e chiave

In **Project Settings → API** ci sono *Project URL* e la chiave *anon public*. Due modi:

- **Una volta per tutti**: scriverli in [`app/config.js`](../app/config.js) e pubblicare. Gli operatori inseriscono solo email e password.
- **Da ogni dispositivo**: lasciare `config.js` vuoto e inserirli nel pannello **Cloud** dell'app.

La chiave *anon* è pubblica per come è progettata Supabase: chi la conosce non vede nulla senza un account associato a uno studio, perché le regole sono nel database. La chiave *service_role* invece **non va mai** messa nell'app.

## 6. Pubblicare l'app

L'app è la cartella `app/`, fatta di file statici: non c'è nulla da compilare.

**Cloudflare Pages** (gratuito, consigliato): *Workers & Pages → Create → Pages → Connect to Git*, scegliere questo repository, *Build command* vuoto, *Build output directory* `app`. Ogni modifica unita in `main` viene pubblicata da sola.

**Netlify** (gratuito): *Add new site → Import an existing project*, stesso repository, *Publish directory* `app`, nessun comando di build.

Entrambi leggono il file `app/_headers`, che evita di tenere in cache il service worker e quindi fa arrivare subito gli aggiornamenti.

GitHub Pages funziona solo con il repository pubblico o con un piano GitHub a pagamento.

## 7. Primo collegamento

1. Aprire l'app pubblicata sul **desktop**, premere **Cloud**, entrare con il proprio account. Il cloud è vuoto, quindi il desktop vi carica i dati presenti, compresi quelli di esempio.
2. Aprire l'app sul **telefono**, installarla sulla schermata Home, poi **Cloud** in fondo alla pagina e entrare. Il telefono prende i dati del cloud.
3. Registrare una seduta di prova sul telefono, anche in modalità aereo: quando torna la rete compare nei grafici del desktop entro un minuto.

Per ripartire da un cloud vuoto quando arriveranno i dati veri: nel SQL Editor `delete from public.eventi; delete from public.documenti;` (cancella tutto in modo definitivo), poi su ogni dispositivo uscire dal cloud, premere *Ripristina dati di esempio* e ricollegarsi.

## Prima dei dati reali

L'app oggi contiene dati inventati. Prima di inserire dati di pazienti veri serve il passo dedicato al GDPR descritto in [docs/decisione-tecnologica.md](../docs/decisione-tecnologica.md#sicurezza-e-gdpr): accordo sul trattamento con Supabase (*Organization → Legal documents → DPA*), valutazione d'impatto, informativa, conservazione e cancellazione, blocco dell'app sul dispositivo.
