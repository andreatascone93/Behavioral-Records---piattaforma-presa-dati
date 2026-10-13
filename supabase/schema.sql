-- Behavioral Records: schema del database cloud (Supabase / PostgreSQL).
-- Si esegue una volta nel SQL Editor del progetto Supabase. Rieseguirlo è
-- innocuo: crea solo ciò che manca e sostituisce le funzioni.
-- Vedi docs/decisione-tecnologica.md e supabase/LEGGIMI.md.
--
-- Due tabelle di dati:
--   documenti  un paziente con la sua configurazione, una sessione, un
--              operatore. Hanno una versione: chi modifica dice da quale
--              versione parte, così due modifiche contemporanee non si
--              sovrascrivono in silenzio.
--   eventi     i tocchi registrati in seduta. Non si modificano né si
--              cancellano mai; il server accetta ogni evento una sola volta.
-- Ogni riga appartiene a uno studio e ogni utente vede solo il proprio studio
-- (regole per riga, RLS). L'app usa solo le tre funzioni br_profilo,
-- br_cambi e br_invia.

create table if not exists public.studi (
  id text primary key,
  nome text not null,
  creato timestamptz not null default now()
);

create table if not exists public.membri (
  utente uuid primary key references auth.users (id) on delete cascade,
  studio_id text not null references public.studi (id),
  operatore_id text not null,
  ruolo text not null default 'terapista' check (ruolo in ('supervisore', 'terapista', 'osservatore')),
  creato timestamptz not null default now()
);

-- Numero progressivo unico per documenti ed eventi: il dispositivo chiede
-- solo le righe con un numero più alto dell'ultimo che ha visto.
create sequence if not exists public.br_seq;

create table if not exists public.documenti (
  studio_id text not null references public.studi (id),
  id text not null,
  tipo text not null check (tipo in ('soggetto', 'sessione', 'operatore')),
  dati jsonb not null,
  versione integer not null default 1,
  seq bigint not null default nextval('public.br_seq'),
  aggiornato timestamptz not null default now(),
  autore uuid,
  primary key (studio_id, id)
);
create index if not exists documenti_seq on public.documenti (studio_id, seq);

create table if not exists public.eventi (
  studio_id text not null references public.studi (id),
  id text not null,
  sessione_id text not null,
  dati jsonb not null,
  seq bigint not null default nextval('public.br_seq'),
  ricevuto timestamptz not null default now(),
  autore uuid,
  primary key (studio_id, id)
);
create index if not exists eventi_seq on public.eventi (studio_id, seq);
create index if not exists eventi_sessione on public.eventi (studio_id, sessione_id);

-- ---- Regole lato server ----------------------------------------------------

-- Lo studio dell'utente collegato (null se non è stato associato).
create or replace function public.br_mio_studio() returns text
language sql stable security definer set search_path = public as $$
  select studio_id from public.membri where utente = auth.uid()
$$;

-- Numero progressivo, orario e autore li decide il server, mai il dispositivo.
-- Un documento sale di una versione alla volta e non cambia studio, id o tipo.
create or replace function public.br_documenti_timbro() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'UPDATE' then
    if new.studio_id <> old.studio_id or new.id <> old.id or new.tipo <> old.tipo then
      raise exception 'studio, id e tipo di un documento non si modificano';
    end if;
    if new.versione <> old.versione + 1 then
      raise exception 'versione attesa %, ricevuta %', old.versione + 1, new.versione;
    end if;
  else
    new.versione := 1;
  end if;
  new.seq := nextval('public.br_seq');
  new.aggiornato := now();
  new.autore := auth.uid();
  return new;
end
$$;

drop trigger if exists documenti_timbro on public.documenti;
create trigger documenti_timbro before insert or update on public.documenti
  for each row execute function public.br_documenti_timbro();

create or replace function public.br_eventi_timbro() returns trigger
language plpgsql set search_path = public as $$
begin
  new.seq := nextval('public.br_seq');
  new.ricevuto := now();
  new.autore := auth.uid();
  return new;
end
$$;

drop trigger if exists eventi_timbro on public.eventi;
create trigger eventi_timbro before insert on public.eventi
  for each row execute function public.br_eventi_timbro();

-- ---- Visibilità per riga -----------------------------------------------------

alter table public.studi enable row level security;
alter table public.membri enable row level security;
alter table public.documenti enable row level security;
alter table public.eventi enable row level security;

drop policy if exists studi_lettura on public.studi;
create policy studi_lettura on public.studi for select to authenticated
  using (id = public.br_mio_studio());

drop policy if exists membri_lettura on public.membri;
create policy membri_lettura on public.membri for select to authenticated
  using (studio_id = public.br_mio_studio());

drop policy if exists documenti_lettura on public.documenti;
create policy documenti_lettura on public.documenti for select to authenticated
  using (studio_id = public.br_mio_studio());
drop policy if exists documenti_inserimento on public.documenti;
create policy documenti_inserimento on public.documenti for insert to authenticated
  with check (studio_id = public.br_mio_studio());
drop policy if exists documenti_modifica on public.documenti;
create policy documenti_modifica on public.documenti for update to authenticated
  using (studio_id = public.br_mio_studio()) with check (studio_id = public.br_mio_studio());

-- Gli eventi si leggono e si aggiungono, non si modificano né si cancellano.
drop policy if exists eventi_lettura on public.eventi;
create policy eventi_lettura on public.eventi for select to authenticated
  using (studio_id = public.br_mio_studio());
drop policy if exists eventi_inserimento on public.eventi;
create policy eventi_inserimento on public.eventi for insert to authenticated
  with check (studio_id = public.br_mio_studio());

revoke all on public.studi, public.membri, public.documenti, public.eventi from anon;
grant select on public.studi, public.membri to authenticated;
grant select, insert, update on public.documenti to authenticated;
grant select, insert on public.eventi to authenticated;
grant usage on sequence public.br_seq to authenticated;

-- ---- Funzioni usate dall'app -------------------------------------------------

-- Chi sono e in quale studio lavoro.
create or replace function public.br_profilo() returns jsonb
language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'studio', m.studio_id, 'studioNome', s.nome,
    'operatore', m.operatore_id, 'ruolo', m.ruolo)
  from public.membri m join public.studi s on s.id = m.studio_id
  where m.utente = auth.uid()
$$;

-- Righe arrivate dopo i cursori indicati, in ordine, più l'ora del server
-- (serve al dispositivo per sapere fin dove può avanzare i cursori).
create or replace function public.br_cambi(dopo_documenti bigint default 0, dopo_eventi bigint default 0, limite integer default 500)
returns jsonb
language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'ora', now(),
    'documenti', coalesce((
      select jsonb_agg(jsonb_build_object('id', d.id, 'tipo', d.tipo, 'dati', d.dati, 'versione', d.versione,
                                          'seq', d.seq, 'aggiornato', d.aggiornato) order by d.seq)
      from (select * from public.documenti
            where studio_id = public.br_mio_studio() and seq > dopo_documenti
            order by seq limit least(greatest(limite, 1), 1000)) d), '[]'::jsonb),
    'eventi', coalesce((
      select jsonb_agg(jsonb_build_object('id', e.id, 'dati', e.dati, 'seq', e.seq, 'aggiornato', e.ricevuto) order by e.seq)
      from (select * from public.eventi
            where studio_id = public.br_mio_studio() and seq > dopo_eventi
            order by seq limit least(greatest(limite, 1), 1000)) e), '[]'::jsonb)
  )
$$;

-- Invio dal dispositivo. Eventi: aggiunti se nuovi, ignorati se già presenti.
-- Documenti: { id, tipo, dati, base } dove base è la versione da cui parte la
-- modifica (null per un documento nuovo). Se il server ha una versione diversa
-- la modifica non passa e torna "conflitto" con la versione del server.
create or replace function public.br_invia(documenti jsonb default '[]'::jsonb, eventi jsonb default '[]'::jsonb)
returns jsonb
language plpgsql security invoker set search_path = public as $$
declare
  v_studio text := public.br_mio_studio();
  v_doc jsonb;
  v_versione integer;
  v_esiti jsonb := '[]'::jsonb;
  v_eventi integer;
  v_attuale record;
begin
  if v_studio is null then
    raise exception 'utente non associato a uno studio' using errcode = '42501';
  end if;

  insert into public.eventi (studio_id, id, sessione_id, dati)
  select v_studio, e->>'id', coalesce(e->>'sessioneId', ''), e
  from jsonb_array_elements(coalesce(br_invia.eventi, '[]'::jsonb)) e
  on conflict (studio_id, id) do nothing;
  get diagnostics v_eventi = row_count;

  for v_doc in select * from jsonb_array_elements(coalesce(br_invia.documenti, '[]'::jsonb)) loop
    v_versione := null;
    if v_doc->'base' is null or jsonb_typeof(v_doc->'base') = 'null' then
      insert into public.documenti (studio_id, id, tipo, dati)
      values (v_studio, v_doc->>'id', v_doc->>'tipo', v_doc->'dati')
      on conflict (studio_id, id) do nothing
      returning public.documenti.versione into v_versione;
    else
      update public.documenti d
         set dati = v_doc->'dati', versione = d.versione + 1
       where d.studio_id = v_studio and d.id = v_doc->>'id' and d.versione = (v_doc->>'base')::integer
      returning d.versione into v_versione;
    end if;

    if v_versione is not null then
      v_esiti := v_esiti || jsonb_build_array(jsonb_build_object('id', v_doc->>'id', 'esito', 'ok', 'versione', v_versione));
    else
      select d.versione, d.dati, d.tipo into v_attuale
        from public.documenti d where d.studio_id = v_studio and d.id = v_doc->>'id';
      v_esiti := v_esiti || jsonb_build_array(jsonb_build_object(
        'id', v_doc->>'id', 'esito', 'conflitto', 'versione', v_attuale.versione,
        'tipo', v_attuale.tipo, 'dati', v_attuale.dati));
    end if;
  end loop;

  return jsonb_build_object('eventi', v_eventi, 'documenti', v_esiti);
end
$$;

revoke execute on function public.br_profilo(), public.br_cambi(bigint, bigint, integer),
  public.br_invia(jsonb, jsonb), public.br_mio_studio() from public, anon;
grant execute on function public.br_profilo(), public.br_cambi(bigint, bigint, integer),
  public.br_invia(jsonb, jsonb), public.br_mio_studio() to authenticated;

-- ---- Primo studio e primi operatori ------------------------------------------
-- Dopo aver invitato gli operatori (Authentication → Users), togliere i
-- trattini iniziali, sostituire le email e eseguire. operatore_id collega
-- l'account all'operatore dell'app: op_andrea è Andrea nei dati di esempio.
--
-- insert into public.studi (id, nome) values ('studio1', 'Il mio studio')
--   on conflict (id) do nothing;
-- insert into public.membri (utente, studio_id, operatore_id, ruolo)
--   select id, 'studio1', 'op_andrea', 'supervisore' from auth.users where email = 'andrea@esempio.it'
--   on conflict (utente) do nothing;
