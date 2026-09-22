-- =============================================================================
-- 0010_phase2_visits.sql
-- Phase 2, part 4 of 4: visit / trip scheduling.
--
-- SCOPE: planning only. There is deliberately NO driver_id and NO vehicle_id
-- on this table — assignment, acceptance and dispatch are Phase 3, and
-- adding the columns early would invite half-built assignment logic.
--
-- NOTE ON trip_type: the Phase 2 brief listed the field but not its
-- vocabulary, so the enum below is a starting point. Values can be added
-- later (`alter type public.trip_type add value '…';`) but never removed —
-- adjust this list before applying if it does not match how Sharjah Safari
-- classifies trips.
-- =============================================================================

do $$ begin
  create type public.visit_type as enum (
    'VIP',
    'OFFICIAL',
    'SCHOOL',
    'REGULAR',
    'SPECIAL'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.trip_type as enum (
    'ONE_WAY',
    'ROUND_TRIP',
    'SHUTTLE'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.visit_status as enum (
    'DRAFT',
    'SCHEDULED',
    'CANCELLED',
    'COMPLETED'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.visits (
  id                 uuid primary key default gen_random_uuid(),
  visit_date         date not null,
  start_time         time not null,
  expected_end_time  time,
  delegation_name    text not null,
  visit_type         public.visit_type not null default 'REGULAR',
  trip_type          public.trip_type not null default 'ROUND_TRIP',
  number_of_visitors integer not null,
  pickup_location    text not null,
  destination        text not null,
  notes              text,
  status             public.visit_status not null default 'DRAFT',
  created_by         uuid references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint visits_visitors_sane
    check (number_of_visitors > 0 and number_of_visitors <= 10000),
  constraint visits_time_order
    check (expected_end_time is null or expected_end_time > start_time)
);

create index if not exists visits_date_idx    on public.visits (visit_date desc);
create index if not exists visits_status_idx  on public.visits (status);
create index if not exists visits_type_idx    on public.visits (visit_type);
create index if not exists visits_creator_idx on public.visits (created_by);

drop trigger if exists visits_set_updated_at on public.visits;
create trigger visits_set_updated_at
  before update on public.visits
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security — denies by default.
--
--   ADMIN                read + write
--   TRANSPORT_SUPERVISOR read + write
--   MANAGEMENT           read only
--   DRIVER               no access yet (driver-facing views are Phase 3/4)
--   unauthenticated      no access
-- ---------------------------------------------------------------------------
alter table public.visits enable row level security;

drop policy if exists visits_select_privileged on public.visits;
create policy visits_select_privileged on public.visits
  for select using (
    public.current_app_role() in ('ADMIN', 'TRANSPORT_SUPERVISOR', 'MANAGEMENT')
  );

drop policy if exists visits_write_privileged on public.visits;
create policy visits_write_privileged on public.visits
  for all
  using (public.current_app_role() in ('ADMIN', 'TRANSPORT_SUPERVISOR'))
  with check (public.current_app_role() in ('ADMIN', 'TRANSPORT_SUPERVISOR'));

-- ---------------------------------------------------------------------------
-- Final check: every Phase 2 table denies by default.
-- ---------------------------------------------------------------------------
do $$
declare
  unprotected text;
begin
  select string_agg(c.relname, ', ')
  into unprotected
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and c.relname in ('profiles', 'drivers', 'audit_logs', 'vehicles', 'visits')
    and not c.relrowsecurity;

  if unprotected is not null then
    raise exception 'RLS is not enabled on: %', unprotected;
  end if;
end $$;
