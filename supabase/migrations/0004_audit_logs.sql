-- =============================================================================
-- 0004_audit_logs.sql
-- APPEND-ONLY audit trail.
--
-- Integrity model:
--   * RLS has NO update/delete policy  -> normal roles cannot modify history.
--   * BEFORE UPDATE/DELETE triggers RAISE -> even a BYPASSRLS connection
--     (service_role, table owner) cannot alter or remove a row. Rows can only
--     ever be INSERTed.
--   * Inserts are performed server-side with the service-role client
--     (see src/lib/auth/audit.ts); the actor is taken from the verified
--     session, never from client input.
-- =============================================================================

create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.profiles (id) on delete set null,
  actor_email text,
  action      public.audit_action not null,
  entity_type text not null,
  entity_id   text,
  description text,
  metadata    jsonb,
  ip_address  text,
  created_at  timestamptz not null default now()
);

create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_actor_idx   on public.audit_logs (actor_id);
create index if not exists audit_logs_entity_idx  on public.audit_logs (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- Hard append-only guarantee (fires for ALL roles, RLS-bypassing included).
-- ---------------------------------------------------------------------------
create or replace function public.prevent_audit_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_logs is append-only: % is not permitted', tg_op;
end;
$$;

drop trigger if exists audit_logs_no_update on public.audit_logs;
create trigger audit_logs_no_update
  before update on public.audit_logs
  for each row execute function public.prevent_audit_mutation();

drop trigger if exists audit_logs_no_delete on public.audit_logs;
create trigger audit_logs_no_delete
  before delete on public.audit_logs
  for each row execute function public.prevent_audit_mutation();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.audit_logs enable row level security;

-- Read: Admin & Management only.
drop policy if exists audit_select_privileged on public.audit_logs;
create policy audit_select_privileged on public.audit_logs
  for select using (public.current_app_role() in ('ADMIN', 'MANAGEMENT'));

-- No INSERT policy: client roles cannot write directly. Writes go through the
-- server-side service-role client. No UPDATE/DELETE policy: history is immutable.

-- Belt-and-suspenders: strip UPDATE/DELETE grants from client roles.
revoke update, delete on public.audit_logs from anon, authenticated;
