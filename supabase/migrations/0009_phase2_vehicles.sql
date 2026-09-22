-- =============================================================================
-- 0009_phase2_vehicles.sql
-- Phase 2, part 3 of 4: the vehicle fleet register and its type vocabulary.
--
-- No link to trips or drivers exists yet — assignment is Phase 3. This table
-- is master data only.
--
-- VOCABULARY DESIGN
-- -----------------
-- `vehicle_type` is a LOOKUP TABLE, not a PostgreSQL enum.
--
-- Business vocabularies belong in data: Sharjah Safari can add "Coach" or
-- retire "Safari truck" by inserting or flagging a row, with no migration
-- and no deployment. A Postgres enum is the opposite — values can be added
-- but never removed, so an early guess becomes permanent.
--
-- Workflow states (`vehicle_status` below) stay enums on purpose. They are
-- application states the code branches on, not operational vocabulary, so
-- they must not change without a code change.
--
-- Retirement is `active = false`, never a delete: the foreign key is
-- ON DELETE RESTRICT so a type still in use cannot be removed, and history
-- keeps reading correctly.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Vehicle type lookup
-- ---------------------------------------------------------------------------
create table if not exists public.vehicle_types (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- Case-insensitive uniqueness, so "Minibus" and "minibus" cannot coexist.
create unique index if not exists vehicle_types_name_key
  on public.vehicle_types (lower(name));

-- Starter values only. These are a placeholder for the Transport Section's
-- real categories — edit, deactivate or add to them in the app.
insert into public.vehicle_types (name)
values ('Bus'), ('Minibus'), ('Van'), ('SUV'), ('Car'), ('Safari truck')
on conflict (lower(name)) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Vehicle workflow state — a stable application state, so an enum
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.vehicle_status as enum (
    'AVAILABLE',
    'IN_USE',
    'MAINTENANCE',
    'OUT_OF_SERVICE',
    'INACTIVE'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 3. Fleet register
-- ---------------------------------------------------------------------------
create table if not exists public.vehicles (
  id              uuid primary key default gen_random_uuid(),
  vehicle_number  text not null,
  plate_number    text not null,
  vehicle_type_id uuid not null references public.vehicle_types (id)
                    on delete restrict,
  capacity        integer not null,
  status          public.vehicle_status not null default 'AVAILABLE',
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint vehicles_capacity_sane check (capacity > 0 and capacity <= 200)
);

-- Fleet and plate numbers identify one vehicle each, case-insensitively.
create unique index if not exists vehicles_vehicle_number_key
  on public.vehicles (upper(vehicle_number));
create unique index if not exists vehicles_plate_number_key
  on public.vehicles (upper(plate_number));

create index if not exists vehicles_status_idx on public.vehicles (status);
create index if not exists vehicles_type_idx   on public.vehicles (vehicle_type_id);

drop trigger if exists vehicles_set_updated_at on public.vehicles;
create trigger vehicles_set_updated_at
  before update on public.vehicles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security — denies by default, like every other table.
--
--   ADMIN                read + write
--   TRANSPORT_SUPERVISOR read + write
--   MANAGEMENT           read only
--   DRIVER               no access (vehicle master data is not theirs)
--   unauthenticated      no access
--
-- The lookup gets the same matrix: whoever may read vehicles must be able to
-- read the type names, and whoever may manage vehicles may curate the
-- vocabulary.
-- ---------------------------------------------------------------------------
alter table public.vehicles enable row level security;
alter table public.vehicle_types enable row level security;

drop policy if exists vehicles_select_privileged on public.vehicles;
create policy vehicles_select_privileged on public.vehicles
  for select using (
    public.current_app_role() in ('ADMIN', 'TRANSPORT_SUPERVISOR', 'MANAGEMENT')
  );

drop policy if exists vehicles_write_privileged on public.vehicles;
create policy vehicles_write_privileged on public.vehicles
  for all
  using (public.current_app_role() in ('ADMIN', 'TRANSPORT_SUPERVISOR'))
  with check (public.current_app_role() in ('ADMIN', 'TRANSPORT_SUPERVISOR'));

drop policy if exists vehicle_types_select_privileged on public.vehicle_types;
create policy vehicle_types_select_privileged on public.vehicle_types
  for select using (
    public.current_app_role() in ('ADMIN', 'TRANSPORT_SUPERVISOR', 'MANAGEMENT')
  );

drop policy if exists vehicle_types_write_privileged on public.vehicle_types;
create policy vehicle_types_write_privileged on public.vehicle_types
  for all
  using (public.current_app_role() in ('ADMIN', 'TRANSPORT_SUPERVISOR'))
  with check (public.current_app_role() in ('ADMIN', 'TRANSPORT_SUPERVISOR'));
