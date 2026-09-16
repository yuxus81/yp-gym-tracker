-- Umbau 16.09.2026: grobe Körperbereiche pro Trainingstag (und als Momentaufnahme pro Session).
-- Einmal im SQL-Editor ausführen. Mehrfaches Ausführen ist unschädlich.
alter table public.plan_days add column if not exists areas text[] not null default '{}';
alter table public.sessions add column if not exists areas text[] not null default '{}';
