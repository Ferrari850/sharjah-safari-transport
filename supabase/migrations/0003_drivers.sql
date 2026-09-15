-- =============================================================================
-- 0003_drivers.sql
-- Driver roster. Optionally linked to a login (profiles), but a driver can
-- exist without a user account. RLS restricts management to Admin/Supervisor.
-- =============================================================================

create table if not exists public.drivers (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid references public.profiles (id) on delete set null,
  employee_id    text not null unique,
  full_name      text not null,
  phone          text,
  license_number text,
  license_expiry date,
  status         public.driver_status not null default 'ACTIVE',
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists drivers_status_idx  on public.drivers (status);
create index if not exists drivers_profile_idx on public.drivers (profile_id);

drop trigger if exists drivers_set_updated_at on public.drivers;
create trigger drivers_set_updated_at
  before update on public.drivers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.drivers enable row level security;

-- A driver can read their own linked record.
drop policy if exists drivers_select_self on public.drivers;
create policy drivers_select_self on public.drivers
  for select using (profile_id = auth.uid());

-- Admin, Supervisor and Management can read the whole roster.
drop policy if exists drivers_select_privileged on public.drivers;
create policy drivers_select_privileged on public.drivers
  for select using (
    public.current_app_role() in ('ADMIN', 'TRANSPORT_SUPERVISOR', 'MANAGEMENT')
  );

-- Only Admin and Transport Supervisor can create/update/delete drivers.
drop policy if exists drivers_write_privileged on public.drivers;
create policy drivers_write_privileged on public.drivers
  for all
  using (public.current_app_role() in ('ADMIN', 'TRANSPORT_SUPERVISOR'))
  with check (public.current_app_role() in ('ADMIN', 'TRANSPORT_SUPERVISOR'));
