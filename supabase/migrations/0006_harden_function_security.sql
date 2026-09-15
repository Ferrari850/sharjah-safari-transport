-- =============================================================================
-- 0006_harden_function_security.sql
-- Security hardening of every function defined in 0001-0004.
--
-- Migrations 0001-0004 are immutable (CLAUDE.md §4), so this migration
-- re-declares the affected functions with `create or replace` instead of
-- editing them in place. It is idempotent and safe to re-run.
--
-- Three issues are addressed:
--
--   1. MUTABLE search_path.
--      `set_updated_at()` (0001) and `prevent_audit_mutation()` (0004) had no
--      explicit `search_path`, so they inherited the caller's. The four
--      SECURITY DEFINER helpers in 0002 pinned `search_path = public`, which
--      still leaves the session's temp schema (`pg_temp`) ahead of `public`
--      when resolving relation names — a caller can create a temporary table
--      that shadows a table referenced without a schema qualifier.
--      Every function below is now pinned to `search_path = ''` and every
--      object it touches is fully schema-qualified, which is the strongest
--      form and the one Supabase's database linter expects
--      ("function_search_path_mutable").
--
--   2. PRIVILEGE ESCALATION via signup metadata (HIGH).
--      `handle_new_user()` (0002) seeded the new profile's role from
--      `new.raw_user_meta_data ->> 'role'`. That column is populated from the
--      `options.data` payload of `auth.signUp()`, which is entirely
--      client-controlled and only protected by the publishable key — a public
--      value. Anyone able to reach the project's signup endpoint could
--      therefore self-provision as ADMIN, defeating the least-privilege rule
--      in CLAUDE.md §4/§5. The role is now hard-coded to 'DRIVER'; promotion
--      happens only through an admin (or the secret key, for bootstrapping the
--      first admin — see 0005_seed_notes.sql). Client-supplied `full_name` is
--      still honoured: it carries no privilege.
--
--   3. BOOTSTRAP DEADLOCK in protect_profile_privileges() (BLOCKER).
--      A trigger is NOT bypassed by BYPASSRLS — it fires for every caller,
--      the table owner and service_role included. In those trusted contexts
--      there is no JWT, so `auth.uid()` is null, `is_admin()` is false, and
--      the guard rejected the change. That made the documented first-admin
--      bootstrap in 0005_seed_notes.sql ("run it with the service role, which
--      is exempt") fail outright:
--
--        update public.profiles set role = 'ADMIN' where email = '…';
--        ERROR:  Only administrators can change role or active status
--
--      It would equally have blocked the Phase 2 user-management module, which
--      changes roles through the secret-key client. The guard now treats
--      "no app-level actor" as the trusted server-side context it is.
--
--      Why that is safe: `public.profiles` has RLS enabled and its only
--      UPDATE paths are `profiles_update_own` (requires auth.uid() = id) and
--      `profiles_admin_all` (requires is_admin()). A caller holding only the
--      publishable key — anon, or any signed-in user — can therefore never
--      reach this trigger with a null `auth.uid()`; the statement matches zero
--      rows first. Reaching it with a null actor implies a BYPASSRLS
--      connection, which already holds the secret key and is trusted by
--      definition. The app-side rule in CLAUDE.md §2 still stands: always run
--      requireRole/requireCapability BEFORE using the admin client.
--      This exemption depends on RLS remaining enabled on public.profiles —
--      see the assertion at the foot of this file.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0001: shared updated_at trigger (SECURITY INVOKER — pinned for hygiene and
-- to satisfy the linter).
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 0002: role helpers (SECURITY DEFINER — they must read public.profiles
-- without re-entering its RLS policies, which would recurse).
-- ---------------------------------------------------------------------------
create or replace function public.current_app_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_app_role() = 'ADMIN', false);
$$;

-- ---------------------------------------------------------------------------
-- 0002: privilege guard. Only admins — or a trusted server-side connection
-- with no app-level actor — may change `role` / `is_active`; the identity
-- columns can never be re-pointed by an UPDATE.
-- ---------------------------------------------------------------------------
create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.role is distinct from old.role
      or new.is_active is distinct from old.is_active)
     and not public.is_admin()
     -- A null actor means no end-user JWT: the SQL editor or the secret-key
     -- client. RLS keeps publishable-key callers from ever reaching this
     -- branch (see the file header). Required for the first-admin bootstrap.
     and auth.uid() is not null then
    raise exception 'Only administrators can change role or active status';
  end if;

  -- Immutable identity columns.
  new.id := old.id;
  new.email := old.email;
  new.created_at := old.created_at;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 0002: auto-provision a profile for every new auth user.
-- The role is NOT read from client-controlled signup metadata (see header).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    -- Least privilege, always. Never trust signup metadata for authorization:
    -- an admin (or the secret key) promotes the account afterwards.
    'DRIVER'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 0004: append-only guard for audit_logs (SECURITY INVOKER — pinned for
-- hygiene; it must keep firing for every role, RLS-bypassing included).
-- ---------------------------------------------------------------------------
create or replace function public.prevent_audit_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit_logs is append-only: % is not permitted', tg_op;
end;
$$;

-- ---------------------------------------------------------------------------
-- Assertion: the trusted-context exemption above is only sound while RLS is
-- enabled on public.profiles. Fail the migration loudly rather than silently
-- widening who can change a role.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'profiles' and c.relrowsecurity
  ) then
    raise exception
      'Refusing to apply: RLS is not enabled on public.profiles, which the '
      'protect_profile_privileges() trusted-context exemption depends on.';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Verification (optional, run manually):
--
--   select p.proname,
--          p.prosecdef                           as security_definer,
--          coalesce(array_to_string(p.proconfig, ', '), '<<INHERITS CALLER>>')
--                                                as settings
--   from pg_proc p
--   join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'public'
--   order by p.proname;
--
-- Every row must show `search_path=""` under settings.
-- ---------------------------------------------------------------------------
