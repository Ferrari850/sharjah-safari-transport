-- =============================================================================
-- 0001_init_extensions_enums.sql
-- Extensions, enum types, and shared helper functions.
-- =============================================================================

-- gen_random_uuid()
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums (kept in sync with src/lib/constants/roles.ts and database.types.ts)
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum (
    'ADMIN',
    'TRANSPORT_SUPERVISOR',
    'DRIVER',
    'MANAGEMENT'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.driver_status as enum (
    'ACTIVE',
    'INACTIVE',
    'ON_LEAVE',
    'SUSPENDED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.audit_action as enum (
    'INSERT',
    'UPDATE',
    'DELETE',
    'LOGIN',
    'LOGOUT',
    'ROLE_CHANGE',
    'STATUS_CHANGE'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Shared: keep updated_at fresh on every UPDATE
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
