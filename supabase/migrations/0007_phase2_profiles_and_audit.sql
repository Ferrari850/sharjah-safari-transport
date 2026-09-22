-- =============================================================================
-- 0007_phase2_profiles_and_audit.sql
-- Phase 2, part 1 of 4: profile identity fields, richer audit rows, and a
-- safety net around the last remaining administrator.
--
-- Migrations 0001-0006 are immutable (CLAUDE.md §4); everything here is
-- additive and idempotent, so this file is safe to re-run.
--
-- Contents:
--   1. profiles.employee_number  — the employee number shown in the Users
--      module. Nullable (existing rows predate it) but unique when present.
--   2. audit_logs.old_value / new_value / reason — Phase 2 requires the
--      before and after state of a change, plus an operator-supplied reason,
--      as first-class queryable columns rather than loose keys inside
--      `metadata`. Adding columns does NOT weaken the append-only guarantee:
--      the BEFORE UPDATE / BEFORE DELETE triggers from 0004 still reject
--      every mutation, including from a BYPASSRLS connection.
--   3. protect_last_admin() — refuses to demote, deactivate or delete the
--      last active ADMIN, so the system can never be locked out of its own
--      administration. Enforced in the database so it holds no matter which
--      client issues the statement.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Employee number on profiles
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists employee_number text;

-- Unique only among the rows that actually have one; NULLs never collide.
create unique index if not exists profiles_employee_number_key
  on public.profiles (employee_number)
  where employee_number is not null;

-- ---------------------------------------------------------------------------
-- 2. Before / after / reason on audit rows
-- ---------------------------------------------------------------------------
alter table public.audit_logs
  add column if not exists old_value jsonb,
  add column if not exists new_value jsonb,
  add column if not exists reason    text;

-- ---------------------------------------------------------------------------
-- 3. Never lose the last administrator
--
-- SECURITY DEFINER so the count is taken over every profile rather than only
-- the rows the caller can see through RLS. Fires for all callers, including
-- the service role: this is a safety net, not an authorization check, and
-- there is no legitimate path that needs to remove the final administrator.
-- Promote a replacement first, then retry.
-- ---------------------------------------------------------------------------
create or replace function public.protect_last_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  other_admins integer;
begin
  -- Only relevant when the row losing admin status is itself an active admin.
  if old.role <> 'ADMIN' or not old.is_active then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE'
     and new.role = 'ADMIN'
     and new.is_active then
    -- Still an active admin afterwards; nothing to guard.
    return new;
  end if;

  select count(*) into other_admins
  from public.profiles
  where role = 'ADMIN'
    and is_active
    and id <> old.id;

  if other_admins = 0 then
    raise exception
      'Refusing to remove the last active administrator. Promote another administrator first.'
      using errcode = 'restrict_violation';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_last_admin_update on public.profiles;
create trigger profiles_protect_last_admin_update
  before update on public.profiles
  for each row execute function public.protect_last_admin();

drop trigger if exists profiles_protect_last_admin_delete on public.profiles;
create trigger profiles_protect_last_admin_delete
  before delete on public.profiles
  for each row execute function public.protect_last_admin();

-- ---------------------------------------------------------------------------
-- 4. Transport Supervisors need to see DRIVER profiles in order to link a
--    driver record to a login. Scoped to that role only — supervisors still
--    cannot read admin, management or other supervisor profiles.
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select_supervisor_drivers on public.profiles;
create policy profiles_select_supervisor_drivers on public.profiles
  for select using (
    public.current_app_role() = 'TRANSPORT_SUPERVISOR'
    and role = 'DRIVER'
  );
