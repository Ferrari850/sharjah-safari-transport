-- =============================================================================
-- 0008_phase2_drivers.sql
-- Phase 2, part 2 of 4: bring the drivers table to the Phase 2 specification.
--
-- ⚠️  THIS MIGRATION DROPS TWO COLUMNS AND DESTROYS THEIR DATA.
--
--     public.drivers.license_number   (dropped)
--     public.drivers.license_expiry   (dropped)
--
--     Dropping `license_number` is a deliberate data-minimisation
--     requirement: the system stores only whether a driver is licensed for
--     LIGHT or HEAVY vehicles, never the licence document number.
--     `license_expiry` goes with it — it is not part of the Phase 2 driver
--     record and is meaningless without the number it belongs to.
--
--     If either column currently holds data you need, export it BEFORE
--     applying this migration:
--
--       select id, employee_id, full_name, license_number, license_expiry
--       from public.drivers;
--
-- Also replaces the driver_status vocabulary. The Phase 1 enum
-- (ACTIVE / INACTIVE / ON_LEAVE / SUSPENDED) described employment state;
-- Phase 2 needs operational availability. Existing rows are mapped:
--
--       ACTIVE     -> AVAILABLE
--       ON_LEAVE   -> LEAVE
--       SUSPENDED  -> INACTIVE
--       INACTIVE   -> INACTIVE
--
-- Idempotent: the swap is guarded on the old vocabulary still being present,
-- so re-running this file is a no-op.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Licence type vocabulary
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.license_type as enum ('LIGHT', 'HEAVY');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 2. Replace the driver_status vocabulary in place
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    join pg_enum e on e.enumtypid = t.oid
    where n.nspname = 'public'
      and t.typname = 'driver_status'
      and e.enumlabel = 'ACTIVE'        -- a label only the old vocabulary has
  ) then
    alter type public.driver_status rename to driver_status_legacy;

    create type public.driver_status as enum
      ('AVAILABLE', 'BUSY', 'LEAVE', 'OFF_DUTY', 'INACTIVE');

    alter table public.drivers alter column status drop default;

    alter table public.drivers
      alter column status type public.driver_status
      using (
        case status::text
          when 'ACTIVE'    then 'AVAILABLE'
          when 'ON_LEAVE'  then 'LEAVE'
          when 'SUSPENDED' then 'INACTIVE'
          when 'INACTIVE'  then 'INACTIVE'
          else 'AVAILABLE'
        end
      )::public.driver_status;

    alter table public.drivers alter column status set default 'AVAILABLE';

    drop type public.driver_status_legacy;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Licence type on the driver record; retire the licence document columns
-- ---------------------------------------------------------------------------
alter table public.drivers
  add column if not exists license_type public.license_type not null default 'LIGHT';

alter table public.drivers drop column if exists license_number;
alter table public.drivers drop column if exists license_expiry;

create index if not exists drivers_license_type_idx on public.drivers (license_type);

-- A profile may back at most one driver record. Prevents two driver rows
-- silently pointing at the same login.
create unique index if not exists drivers_profile_id_key
  on public.drivers (profile_id)
  where profile_id is not null;

-- ---------------------------------------------------------------------------
-- 4. RLS is already enabled on public.drivers (0003). The Phase 1 policies
--    match the Phase 2 permission matrix exactly, so they are restated here
--    only to keep this file self-describing — the definitions are unchanged:
--
--      drivers_select_self        DRIVER reads their own linked record
--      drivers_select_privileged  ADMIN / SUPERVISOR / MANAGEMENT read all
--      drivers_write_privileged   ADMIN / SUPERVISOR write
--
--    MANAGEMENT therefore stays read-only and DRIVER cannot write at all.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'drivers' and c.relrowsecurity
  ) then
    raise exception 'Expected RLS to be enabled on public.drivers (migration 0003).';
  end if;
end $$;
