-- Kraftbuch — Supabase-Schema
-- Einmal komplett im SQL-Editor ausführen (Project → SQL Editor → New query → Run).
-- Mehrfaches Ausführen ist unschädlich.
--
-- Prinzip: Die App speichert alles zuerst auf dem Handy und lädt per Upsert hoch.
-- Jede Zeile gehört genau einem Konto (user_id), Row Level Security sperrt alles andere.
-- updated_at setzt IMMER der Server (Trigger) — die Uhr des Handys spielt keine Rolle.
-- Gelöscht wird nie hart, sondern über deleted_at (damit andere Geräte davon erfahren).

create or replace function public.kb_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

-- Übungen ------------------------------------------------------------------
create table if not exists public.exercises (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  primary_muscles text[] not null default '{}',
  secondary_muscles text[] not null default '{}',
  equipment text not null default '',
  rest_sec integer not null default 90,
  notes text not null default '',
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Trainingstage ------------------------------------------------------------
create table if not exists public.plan_days (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  color smallint not null default 0,
  weekdays smallint[] not null default '{}',
  sort integer not null default 0,
  archived boolean not null default false,
  notes text not null default '',
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Übungen je Trainingstag --------------------------------------------------
-- Bewusst ohne Fremdschlüssel auf exercises/plan_days: Beim Hochladen aus dem
-- Offline-Speicher darf die Reihenfolge nie zu einem Fehler führen.
create table if not exists public.plan_day_exercises (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  plan_day_id uuid not null,
  exercise_id uuid not null,
  sort integer not null default 0,
  target_sets smallint not null default 3,
  reps_min smallint not null default 8,
  reps_max smallint not null default 12,
  rest_sec integer,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Sessions -----------------------------------------------------------------
create table if not exists public.sessions (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  plan_day_id uuid,
  name text not null,
  color smallint not null default 0,
  started_at timestamptz not null,
  ended_at timestamptz,
  exercise_ids uuid[] not null default '{}',
  notes text not null default '',
  energy smallint check (energy between 1 and 5),
  bodyweight numeric(5, 2),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Sätze --------------------------------------------------------------------
create table if not exists public.session_sets (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_id uuid not null,
  exercise_id uuid not null,
  set_index integer not null default 0,
  kind text not null default 'working' check (kind in ('warmup', 'working', 'drop', 'failure')),
  weight double precision,
  reps integer,
  rpe numeric(3, 1),
  drops jsonb not null default '[]'::jsonb,
  done_at timestamptz,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Trigger, Indizes, Row Level Security -------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['exercises', 'plan_days', 'plan_day_exercises', 'sessions', 'session_sets'] loop
    execute format('drop trigger if exists kb_touch on public.%I', t);
    execute format(
      'create trigger kb_touch before insert or update on public.%I for each row execute function public.kb_touch_updated_at()',
      t
    );
    execute format('create index if not exists %I on public.%I (user_id, updated_at, id)', t || '_sync_idx', t);

    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists kb_select on public.%I', t);
    execute format('drop policy if exists kb_insert on public.%I', t);
    execute format('drop policy if exists kb_update on public.%I', t);
    execute format('create policy kb_select on public.%I for select to authenticated using (user_id = (select auth.uid()))', t);
    execute format('create policy kb_insert on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', t);
    execute format(
      'create policy kb_update on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t
    );
    -- Kein DELETE-Recht: Löschen läuft ausschließlich über deleted_at.
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update on public.%I to authenticated', t);
  end loop;
end;
$$;
