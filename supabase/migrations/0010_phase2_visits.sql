-- =============================================================================
-- 0010_phase2_visits.sql
-- Phase 2, part 4 of 4: visit / trip scheduling and its vocabularies.
--
-- SCOPE: planning only. There is deliberately NO driver_id and NO vehicle_id
-- on this table — assignment, acceptance and dispatch are Phase 3, and
-- adding the columns early would invite half-built assignment logic.
--
-- VOCABULARY DESIGN
-- -----------------
-- `trip_type` and `visit_type` are LOOKUP TABLES, not PostgreSQL enums.
--
-- Both classify the work rather than drive it. Nothing in this schema — no
-- RLS policy, no constraint, no trigger — reads either value, and no
-- application code branches on them; they are filtered, displayed and
-- reported on. So there is no integrity or security argument for freezing
-- them into a type, and a strong operational argument against it: the real
-- Sharjah Safari categories are still to be settled with the Transport
-- Section, and a Postgres enum can gain values but never lose them.
--
-- `visit_status` stays an enum. It is a workflow state the application
-- genuinely branches on (a CANCELLED visit cannot be edited, a SCHEDULED one
-- counts toward the dashboard), so changing the set must mean changing the
-- code, and the database should refuse anything outside it.
--
-- That is the dividing line used throughout Phase 2:
--   business vocabulary -> lookup table, editable in the app
--   workflow state      -> enum, changed only by migration + code
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Lookups
-- ---------------------------------------------------------------------------
create table if not exists public.trip_types (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists trip_types_name_key
  on public.trip_types (lower(name));

create table if not exists public.visit_types (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists visit_types_name_key
  on public.visit_types (lower(name));

-- Starter values only — placeholders to be confirmed with the Transport
-- Section. Edit, deactivate or add to them in the app; no migration needed.
insert into public.trip_types (name)
values ('One way'), ('Round trip'), ('Shuttle')
on conflict (lower(name)) do nothing;

insert into public.visit_types (name)
values ('VIP'), ('Official'), ('School'), ('Regular'), ('Special')
on conflict (lower(name)) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Visit workflow state — a stable application state, so an enum
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.visit_status as enum (
    'DRAFT',
    'SCHEDULED',
    'CANCELLED',
    'COMPLETED'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 3. Visits
-- ---------------------------------------------------------------------------
create table if not exists public.visits (
  id                 uuid primary key default gen_random_uuid(),
  visit_date         date not null,
  start_time         time not null,
  expected_end_time  time,
  delegation_name    text not null,
  visit_type_id      uuid not null references public.visit_types (id)
                       on delete restrict,
  trip_type_id       uuid not null references public.trip_types (id)
                       on delete restrict,
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

create index if not exists visits_date_idx       on public.visits (visit_date desc);
create index if not exists visits_status_idx     on public.visits (status);
create index if not exists visits_visit_type_idx on public.visits (visit_type_id);
create index if not exists visits_trip_type_idx  on public.visits (trip_type_id);
create index if not exists visits_creator_idx    on public.visits (created_by);

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
--
-- The two lookups follow the same matrix, for the same reason as
-- vehicle_types: reading a visit means reading its type name.
-- ---------------------------------------------------------------------------
alter table public.visits      enable row level security;
alter table public.trip_types  enable row level security;
alter table public.visit_types enable row level security;

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

drop policy if exists trip_types_select_privileged on public.trip_types;
create policy trip_types_select_privileged on public.trip_types
  for select using (
    public.current_app_role() in ('ADMIN', 'TRANSPORT_SUPERVISOR', 'MANAGEMENT')
  );

drop policy if exists trip_types_write_privileged on public.trip_types;
create policy trip_types_write_privileged on public.trip_types
  for all
  using (public.current_app_role() in ('ADMIN', 'TRANSPORT_SUPERVISOR'))
  with check (public.current_app_role() in ('ADMIN', 'TRANSPORT_SUPERVISOR'));

drop policy if exists visit_types_select_privileged on public.visit_types;
create policy visit_types_select_privileged on public.visit_types
  for select using (
    public.current_app_role() in ('ADMIN', 'TRANSPORT_SUPERVISOR', 'MANAGEMENT')
  );

drop policy if exists visit_types_write_privileged on public.visit_types;
create policy visit_types_write_privileged on public.visit_types
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
    and c.relname in (
      'profiles', 'drivers', 'audit_logs',
      'vehicles', 'vehicle_types',
      'visits', 'trip_types', 'visit_types'
    )
    and not c.relrowsecurity;

  if unprotected is not null then
    raise exception 'RLS is not enabled on: %', unprotected;
  end if;
end $$;
