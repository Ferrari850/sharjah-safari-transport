-- =============================================================================
-- 0009_phase2_vehicles.sql
-- Phase 2, part 3 of 4: the vehicle fleet register.
--
-- No link to trips or drivers exists yet — assignment is Phase 3. This table
-- is master data only.
--
-- NOTE ON vehicle_type: the Phase 2 brief did not specify a vocabulary, so
-- the enum below is a starting point. Adding a value later is a one-line
-- migration (`alter type public.vehicle_type add value 'COACH';`) — but
-- values cannot be removed, so prune this list before applying if any of
-- these do not apply to the Sharjah Safari fleet.
-- =============================================================================

do $$ begin
  create type public.vehicle_type as enum (
    'BUS',
    'MINIBUS',
    'VAN',
    'SUV',
    'CAR',
    'SAFARI_TRUCK'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.vehicle_status as enum (
    'AVAILABLE',
    'IN_USE',
    'MAINTENANCE',
    'OUT_OF_SERVICE',
    'INACTIVE'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.vehicles (
  id             uuid primary key default gen_random_uuid(),
  vehicle_number text not null,
  plate_number   text not null,
  vehicle_type   public.vehicle_type not null,
  capacity       integer not null,
  status         public.vehicle_status not null default 'AVAILABLE',
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint vehicles_capacity_sane check (capacity > 0 and capacity <= 200)
);

-- Fleet and plate numbers identify one vehicle each, case-insensitively.
create unique index if not exists vehicles_vehicle_number_key
  on public.vehicles (upper(vehicle_number));
create unique index if not exists vehicles_plate_number_key
  on public.vehicles (upper(plate_number));

create index if not exists vehicles_status_idx on public.vehicles (status);
create index if not exists vehicles_type_idx   on public.vehicles (vehicle_type);

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
-- ---------------------------------------------------------------------------
alter table public.vehicles enable row level security;

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
