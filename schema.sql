-- ============================================================
-- RACKED — Supabase schema
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to re-run (uses "if not exists" / will error only on duplicate policies).
-- ============================================================

-- Workout sets: one row per set.
create table if not exists public.sets (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now(),
  log_date    date not null,        -- 'YYYY-MM-DD' (local date the set was performed)
  day         text not null,        -- split name, e.g. 'Chest / Triceps'
  exercise    text not null,        -- e.g. 'Barbell Flat Bench'
  weight      numeric not null,     -- lbs (0 for bodyweight movements like pull-ups)
  reps        int not null,
  set_number  int not null          -- 1-based index of the set within that exercise that day
);

-- Bodyweight log (powers relative-strength metrics).
create table if not exists public.bodyweight (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now(),
  log_date    date not null,
  weight      numeric not null      -- lbs
);

-- Row Level Security on.
alter table public.sets       enable row level security;
alter table public.bodyweight enable row level security;

-- Personal single-user app: allow the public (anon) key full access.
-- NOTE: this means anyone holding the project URL + anon key can read/write.
-- Fine for a private workout log; swap for Supabase Auth + per-user policies if you want real privacy.
create policy "anon full access sets" on public.sets
  for all to anon using (true) with check (true);
create policy "anon full access bodyweight" on public.bodyweight
  for all to anon using (true) with check (true);

-- Explicit grants so the REST API can reach the tables regardless of project defaults.
grant usage on schema public to anon;
grant all on public.sets       to anon;
grant all on public.bodyweight to anon;

-- Helpful indexes (optional but nice as data grows).
create index if not exists sets_day_date_idx  on public.sets (day, log_date desc);
create index if not exists sets_exercise_idx  on public.sets (exercise, log_date);
