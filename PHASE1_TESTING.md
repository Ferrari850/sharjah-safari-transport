# Phase 1 — Manual Acceptance Testing

Manual acceptance checklist for the **Sharjah Safari Transport Management
System (SSTMS)** foundation release. Phase 1 covers authentication, role-based
access control, the `profiles` / `drivers` / `audit_logs` schema with Row Level
Security, an append-only audit trail, the login page and the protected
dashboard. **Trips and Assignments are out of scope** and must not appear
anywhere in the UI.

Work top to bottom — later sections assume the accounts created earlier.
Record a result for every check. Any **FAIL** in a section marked
🔴 **security-critical** blocks release.

**Legend:** ☐ not run · ✅ pass · ❌ fail

---

## 0. Test environment & accounts

Use a **throwaway Supabase project**, never production data.

| Setting | Value |
| ------- | ----- |
| Supabase project | _________________ (staging) |
| App URL | `http://localhost:3000` |
| Tester | _________________ |
| Date | _________________ |
| Commit under test | _________________ |

### 0.1 Accounts to create

Create these during §2. Use real, distinct mailboxes (or Supabase Studio's
"Add user" with auto-confirm) and record the passwords somewhere disposable.

| # | Email | Role | `is_active` | Purpose |
| - | ----- | ---- | ----------- | ------- |
| A1 | `admin@…` | `ADMIN` | true | Full control |
| S1 | `supervisor@…` | `TRANSPORT_SUPERVISOR` | true | Driver management |
| D1 | `driver1@…` | `DRIVER` | true | Own records only |
| D2 | `driver2@…` | `DRIVER` | true | Isolation counterpart to D1 |
| M1 | `management@…` | `MANAGEMENT` | true | Read-only oversight |
| X1 | `disabled@…` | `DRIVER` | **false** | Deactivated-account path |

### 0.2 Local configuration

```bash
cp .env.example .env.local     # fill in from Supabase: Project Settings > API Keys
npm install
npm run lint && npm run build  # both must pass before testing
npm run dev
```

`.env.local` must define exactly:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
```

| ☐ | Check | Expected |
| - | ----- | -------- |
| ☐ | `npm install` | Completes, no high/critical advisories |
| ☐ | `npm run lint` | Exit 0, no warnings |
| ☐ | `npm run build` | Exit 0, type check clean |
| ☐ | `git status` | `.env.local`, `node_modules/`, `.next/`, `tsconfig.tsbuildinfo` all untracked |

---

## 1. Database migrations

Apply **in ascending order** via the Supabase SQL editor or `supabase db push`.
Never skip or reorder. Never edit a migration that has already run — add a new
numbered file instead (CLAUDE.md §4).

| ☐ | Migration | Expected result |
| - | --------- | --------------- |
| ☐ | `0001_init_extensions_enums.sql` | `pgcrypto` enabled; `user_role`, `driver_status`, `audit_action` enums created; `set_updated_at()` exists |
| ☐ | `0002_profiles.sql` | `profiles` table + index + triggers; `current_app_role()`, `is_admin()`, `protect_profile_privileges()`, `handle_new_user()`; RLS on with 4 policies |
| ☐ | `0003_drivers.sql` | `drivers` table + 2 indexes + updated_at trigger; RLS on with 3 policies |
| ☐ | `0004_audit_logs.sql` | `audit_logs` table + 3 indexes; no-update/no-delete triggers; RLS on, SELECT policy only |
| ☐ | `0005_seed_notes.sql` | No-op (`select 1`). Operational notes only — creates nothing |
| ☐ | `0006_harden_function_security.sql` | Re-declares all 6 functions with `search_path = ''`; removes the signup-metadata role escalation; repairs the first-admin bootstrap. Asserts RLS is on `profiles` and aborts if not |

### 1.1 Post-migration verification

```sql
-- Enums match src/lib/constants/roles.ts exactly.
select t.typname, string_agg(e.enumlabel, ', ' order by e.enumsortorder)
from pg_type t join pg_enum e on e.enumtypid = t.oid
where t.typname in ('user_role','driver_status','audit_action')
group by t.typname;

-- Every table has RLS enabled.
select relname, relrowsecurity
from pg_class
where relname in ('profiles','drivers','audit_logs');

-- Policy inventory.
select tablename, policyname, cmd
from pg_policies where schemaname = 'public'
order by tablename, policyname;
```

| ☐ | Check | Expected |
| - | ----- | -------- |
| ☐ | `user_role` | `ADMIN, TRANSPORT_SUPERVISOR, DRIVER, MANAGEMENT` |
| ☐ | `driver_status` | `ACTIVE, INACTIVE, ON_LEAVE, SUSPENDED` |
| ☐ | `audit_action` | `INSERT, UPDATE, DELETE, LOGIN, LOGOUT, ROLE_CHANGE, STATUS_CHANGE` |
| ☐ | `relrowsecurity` | `true` for all three tables |
| ☐ | `audit_logs` policies | Exactly one, a `SELECT` policy. **No** INSERT/UPDATE/DELETE policy |
| ☐ | Re-running 0001–0006 | Idempotent — no errors on a second run |

### 1.2 🔴 Function `search_path` is pinned

```sql
select p.proname,
       p.prosecdef as security_definer,
       coalesce(array_to_string(p.proconfig, ', '), '<<INHERITS CALLER>>') as settings
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname;
```

| ☐ | Function | Expected |
| - | -------- | -------- |
| ☐ | `current_app_role` | `security_definer = true`, `search_path=""` |
| ☐ | `is_admin` | `security_definer = true`, `search_path=""` |
| ☐ | `protect_profile_privileges` | `security_definer = true`, `search_path=""` |
| ☐ | `handle_new_user` | `security_definer = true`, `search_path=""` |
| ☐ | `set_updated_at` | `search_path=""` |
| ☐ | `prevent_audit_mutation` | `search_path=""` |
| ☐ | Any row showing `<<INHERITS CALLER>>` | **FAIL** — mutable search_path |
| ☐ | Supabase Studio → Advisors → Security | No `function_search_path_mutable` warnings |

---

## 2. First ADMIN bootstrap

There is no admin yet, so the first promotion must use the **secret key** (SQL
editor / service role), which is exempt from `protect_profile_privileges()`.
Follow `supabase/migrations/0005_seed_notes.sql`.

> **Requires 0006.** A trigger is not bypassed by `BYPASSRLS`, so before
> migration 0006 this guard fired even for the SQL editor and the service role
> — where there is no JWT, so `is_admin()` is false — and the documented
> bootstrap failed with `ERROR: Only administrators can change role or active
> status`. 0006 exempts the no-app-actor case. If you hit that error, 0006 has
> not been applied.

| ☐ | Step | Expected |
| - | ---- | -------- |
| ☐ | Create auth user A1 (Studio → Authentication → Add user) | User created |
| ☐ | Inspect `public.profiles` | A row exists for A1 — created automatically by the `on_auth_user_created` trigger |
| ☐ | That row's `role` | **`DRIVER`** — least privilege, not ADMIN |
| ☐ | That row's `is_active` | `true`; `email` matches; `created_at`/`updated_at` set |
| ☐ | Promote via SQL editor: `update public.profiles set role = 'ADMIN' where email = '…';` | 1 row updated — **not** "Only administrators can change role or active status" (see the note above) |
| ☐ | Re-read the row | `role = 'ADMIN'`, `updated_at` bumped by `set_updated_at()` |
| ☐ | Create S1, D1, D2, M1, X1 the same way and promote each to its target role | All roles set as per §0.1 |
| ☐ | Set X1 inactive: `update public.profiles set is_active = false where email = '…';` | `is_active = false` |

### 2.1 🔴 Signup metadata cannot grant a role

Migration 0006 closes a privilege-escalation hole: `handle_new_user()` must
ignore any client-supplied `role` in signup metadata. Test it directly against
the public auth endpoint with the **publishable** key.

```bash
curl -X POST "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/signup" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"escalate-test@example.com","password":"Test-Passw0rd!",
       "data":{"full_name":"Escalation Probe","role":"ADMIN"}}'
```

| ☐ | Check | Expected |
| - | ----- | -------- |
| ☐ | Resulting profile row's `role` | **`DRIVER`** — the requested `ADMIN` is ignored |
| ☐ | Resulting profile row's `full_name` | `Escalation Probe` (non-privileged metadata is still honoured) |
| ☐ | If the row came back `ADMIN` | 🔴 **FAIL — do not release.** 0006 did not apply |
| ☐ | Delete the probe user afterwards | Removed from `auth.users` and `profiles` (cascade) |
| ☐ | Confirm public signup is disabled in project settings if self-registration is not wanted | Auth → Providers → "Allow new users to sign up" off |

---

## 3. Login

Sign in at `/login` with **A1**.

| ☐ | Check | Expected |
| - | ----- | -------- |
| ☐ | Visit `/login` while signed out | Login page renders; no redirect loop |
| ☐ | Branding | Sharjah Safari logo/identity; colours from CSS variables, not hard-coded hex |
| ☐ | Submit valid credentials | Redirects to `/dashboard` |
| ☐ | Dashboard content | Greets the user; role badge shows **Administrator** |
| ☐ | Sidebar navigation | Only Phase 1 destinations. **No Trips, no Assignments** |
| ☐ | Visit `/login` while signed in | Redirected back to `/dashboard` (middleware) |
| ☐ | Visit `/` | Resolves sensibly (dashboard when signed in, login when not) |
| ☐ | Deep link `/dashboard?x=1` while signed out, then log in | Returns to the intended page; `redirect` query param respected |
| ☐ | Session cookie | `HttpOnly`, `SameSite=Lax`, `Secure` when served over HTTPS |
| ☐ | Browser devtools → Application → Local Storage | No access/refresh token stored outside cookies |
| ☐ | Repeat login for S1, D1, D2, M1 | Each lands on `/dashboard` with the correct role badge |

---

## 4. Invalid login

| ☐ | Input | Expected |
| - | ----- | -------- |
| ☐ | Correct email, wrong password | Generic error ("Invalid email or password"). Stays on `/login` |
| ☐ | Unregistered email | **Same generic error** — must not reveal whether the account exists |
| ☐ | Empty email / empty password | Field validation; no network request |
| ☐ | Malformed email (`not-an-email`) | Validation error |
| ☐ | SQL-ish payload (`' OR 1=1 --`) in email | Treated as plain text; ordinary validation error |
| ☐ | Overlong input (2,000+ chars) | Handled gracefully; no crash, no 500 |
| ☐ | 6+ rapid failed attempts | Supabase rate limiting engages; error stays generic |
| ☐ | After any failure | No session cookie set; `/dashboard` still redirects to `/login` |
| ☐ | Server logs | No password or token echoed |

---

## 5. Logout

| ☐ | Check | Expected |
| - | ----- | -------- |
| ☐ | Click Sign out | Returns to `/login` |
| ☐ | Back button after logout | Does **not** restore the dashboard; redirects to `/login` |
| ☐ | Visit `/dashboard` after logout | Redirected to `/login` |
| ☐ | Auth cookies after logout | Cleared |
| ☐ | 🔴 `GET /auth/signout` (paste in address bar) | **Does not sign out** — the route is POST-only, so a prefetch, link or crawler cannot trigger it |
| ☐ | `POST /auth/signout` | Signs out correctly |
| ☐ | Sign out in tab A, then use tab B | Tab B is unauthenticated on its next request |

---

## 6. Inactive / deactivated account

Use **X1** (`is_active = false`).

| ☐ | Check | Expected |
| - | ----- | -------- |
| ☐ | Log in as X1 with correct credentials | Refused at `requireProfile()` — redirected to `/login?error=account_disabled` |
| ☐ | Message shown | Clear "account disabled" notice, not a generic credential error |
| ☐ | Any `/dashboard` access as X1 | Blocked every time |
| ☐ | Deactivate D2 **while D2 is signed in**, then have D2 navigate | Next protected request redirects to `/login?error=account_disabled` |
| ☐ | Reactivate D2 (`is_active = true`) and log in | Normal access restored |

> **Known Phase 1 limitation.** `is_active` is enforced by the server guard
> `requireProfile()`, not by RLS. A deactivated user holding a still-valid JWT
> can therefore continue to read **their own** `profiles` / `drivers` row
> through the Supabase REST API directly, until the token expires. They gain no
> extra rows and cannot escalate. Record the observed behaviour below and treat
> tightening this (adding `is_active` to the RLS policies) as a Phase 2 decision.
>
> | ☐ | Direct REST read as deactivated X1 | Observed: _________________ |

---

## 7. Role permissions

For each role: sign in, exercise the UI, then confirm the same boundary at the
API level in §8. UI role checks are cosmetic — the database is the real
boundary.

### 7.1 ADMIN (A1)

| ☐ | Check | Expected |
| - | ----- | -------- |
| ☐ | Role badge | Administrator |
| ☐ | Read all profiles | Permitted |
| ☐ | Read driver roster | Permitted |
| ☐ | Create / update / delete a driver | Permitted |
| ☐ | Read audit logs | Permitted |
| ☐ | Change another user's `role` | Permitted |
| ☐ | Change another user's `is_active` | Permitted |
| ☐ | Trips / Assignments | Absent — out of Phase 1 scope |

### 7.2 TRANSPORT_SUPERVISOR (S1)

| ☐ | Check | Expected |
| - | ----- | -------- |
| ☐ | Role badge | Transport Supervisor |
| ☐ | Read driver roster | Permitted (`VIEW_DRIVERS`) |
| ☐ | Create / update / delete a driver | Permitted (`MANAGE_DRIVERS`) |
| ☐ | 🔴 Read all profiles | **Denied** — own profile only |
| ☐ | 🔴 Read audit logs | **Denied** (`VIEW_AUDIT_LOGS` excludes this role) |
| ☐ | 🔴 Change any user's role | **Denied** (`MANAGE_USERS` is ADMIN-only) |
| ☐ | Navigate to an admin-only URL directly | Redirected to `/dashboard?error=forbidden` |

### 7.3 DRIVER (D1)

| ☐ | Check | Expected |
| - | ----- | -------- |
| ☐ | Role badge | Driver |
| ☐ | Read own profile | Permitted |
| ☐ | Edit own `full_name` / `phone` | Permitted |
| ☐ | Read own linked driver record | Permitted (`drivers_select_self`) |
| ☐ | 🔴 Read the full driver roster | **Denied** |
| ☐ | 🔴 Read D2's profile or driver row | **Denied** — zero rows |
| ☐ | 🔴 Create / update / delete any driver | **Denied** |
| ☐ | 🔴 Read audit logs | **Denied** |
| ☐ | 🔴 Change own `role` or `is_active` | **Denied** (see §9) |

### 7.4 MANAGEMENT (M1) — read-only

| ☐ | Check | Expected |
| - | ----- | -------- |
| ☐ | Role badge | Management |
| ☐ | Read all profiles | Permitted |
| ☐ | Read driver roster | Permitted (`VIEW_DRIVERS`) |
| ☐ | Read audit logs | Permitted (`VIEW_AUDIT_LOGS`) |
| ☐ | 🔴 Create / update / delete a driver | **Denied** — not in `MANAGE_DRIVERS` |
| ☐ | 🔴 Change any user's role or `is_active` | **Denied** |
| ☐ | 🔴 Any write anywhere in the app | **Denied** — oversight is read-only |

---

## 8. 🔴 RLS negative tests (bypass the UI)

The UI is not the boundary. Run these against the REST API with the
**publishable** key and a real user's access token — exactly what a hostile
client can do. Grab a token from the browser's auth cookie after signing in, or
via `signInWithPassword`.

```bash
TOKEN="<access_token for the role under test>"
API="$NEXT_PUBLIC_SUPABASE_URL/rest/v1"
KEY="$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"

# Attempt to read every profile.
curl -s "$API/profiles?select=*" -H "apikey: $KEY" -H "Authorization: Bearer $TOKEN"

# Attempt to read the whole driver roster.
curl -s "$API/drivers?select=*" -H "apikey: $KEY" -H "Authorization: Bearer $TOKEN"

# Attempt to read the audit trail.
curl -s "$API/audit_logs?select=*" -H "apikey: $KEY" -H "Authorization: Bearer $TOKEN"
```

| ☐ | As | Request | Expected |
| - | -- | ------- | -------- |
| ☐ | D1 | `GET /profiles?select=*` | Exactly **one** row — D1's own |
| ☐ | D1 | `GET /drivers?select=*` | Only D1's linked record (or `[]` if unlinked) |
| ☐ | D1 | `GET /audit_logs?select=*` | `[]` — no read policy for DRIVER |
| ☐ | D1 | `POST /drivers` (new driver) | Denied (RLS violation) |
| ☐ | D1 | `PATCH /drivers?id=eq.<D2 record>` | 0 rows affected / denied |
| ☐ | D1 | `DELETE /drivers?id=eq.<any>` | Denied |
| ☐ | S1 | `GET /profiles?select=*` | Only S1's own row |
| ☐ | S1 | `GET /audit_logs?select=*` | `[]` |
| ☐ | S1 | `POST /drivers` | Permitted |
| ☐ | M1 | `GET /drivers?select=*` | Full roster |
| ☐ | M1 | `POST /drivers` | **Denied** — read-only role |
| ☐ | M1 | `PATCH /drivers?id=eq.<any>` | **Denied** |
| ☐ | A1 | All of the above | Permitted |
| ☐ | anon (no `Authorization` header) | `GET` on all three tables | `[]` / denied — every table denies by default |

---

## 9. 🔴 Privilege escalation attempts

Every one of these must fail.

| ☐ | Attempt | Expected |
| - | ------- | -------- |
| ☐ | D1: `PATCH /profiles?id=eq.<D1>` with `{"role":"ADMIN"}` | Rejected — `protect_profile_privileges()` raises "Only administrators can change role or active status" |
| ☐ | D1: `PATCH /profiles?id=eq.<D1>` with `{"is_active":true}` when already true | Rejected or no-op; never a privilege change |
| ☐ | D1: `PATCH /profiles?id=eq.<D2>` with any body | 0 rows — `profiles_update_own` restricts to `auth.uid() = id` |
| ☐ | D1: `PATCH /profiles?id=eq.<D1>` with `{"id":"<D2 uuid>"}` | `id` forced back to the original by the trigger |
| ☐ | D1: `PATCH /profiles?id=eq.<D1>` with `{"email":"admin@…"}` | `email` forced back to the original |
| ☐ | D1: `POST /profiles` (insert a fresh ADMIN row) | Denied — no INSERT policy |
| ☐ | S1: `PATCH /profiles?id=eq.<S1>` with `{"role":"ADMIN"}` | Rejected — supervisor is not an admin |
| ☐ | M1: `PATCH /profiles?id=eq.<M1>` with `{"role":"ADMIN"}` | Rejected |
| ☐ | Signup with `data.role = "ADMIN"` (see §2.1) | Profile created as `DRIVER` |
| ☐ | Forged/edited JWT with `role: ADMIN` in the payload | Rejected — signature check fails; `getUser()` revalidates against Supabase |
| ☐ | Tamper with the role badge in devtools, then attempt a privileged action | Cosmetic only — server guard and RLS still deny |
| ☐ | Create a temp table `profiles` in the session, then call `current_app_role()` | Unaffected — `search_path = ''` and fully-qualified references (§1.2) |
| ☐ | 🔴 anon (publishable key, **no** `Authorization` header): `PATCH /profiles?...` with `{"role":"ADMIN"}` | 0 rows. The trusted-context exemption added in 0006 is unreachable from the publishable key: RLS matches no row, so the trigger never runs |
| ☐ | 🔴 Disable RLS on `profiles`, then re-apply 0006 | Migration **aborts** with "Refusing to apply: RLS is not enabled on public.profiles". Re-enable RLS afterwards |
| ☐ | A1: demote self, then attempt an admin action | Correctly denied afterwards — confirms the role is read live, not cached |

---

## 10. Audit log — inserts

Audit writes go through `recordAuditLog()` (server-side, secret key), and the
actor comes from the **verified session**, never from client input.

| ☐ | Check | Expected |
| - | ----- | -------- |
| ☐ | Perform an audited action (e.g. a role change by A1) | A new `audit_logs` row appears |
| ☐ | `actor_id` / `actor_email` | The **acting** user, taken from the server session |
| ☐ | `action` | A valid `audit_action` enum value |
| ☐ | `entity_type` / `entity_id` | Identify the affected record |
| ☐ | `created_at` | Server time, populated automatically |
| ☐ | `ip_address` | Populated from `x-forwarded-for` / `x-real-ip` where available |
| ☐ | 🔴 Attempt to spoof the actor from the client | Impossible — `actor_id` is never read from the request body |
| ☐ | 🔴 `POST /audit_logs` with a user token | Denied — no INSERT policy for `anon` / `authenticated` |
| ☐ | Read as A1 and M1 | Permitted |
| ☐ | 🔴 Read as S1 and D1 | `[]` — denied |
| ☐ | Break audit logging deliberately (e.g. bad secret key) and retry the action | Primary operation still succeeds; failure only logged to the server console |

---

## 11. 🔴 Audit log — immutability

The append-only guarantee holds at the database level, for **every** role
including RLS-bypassing connections. Run these in the SQL editor, which uses
the service role.

```sql
-- Both must RAISE, not succeed silently.
update public.audit_logs set description = 'tampered' where id = '<existing id>';
delete from public.audit_logs where id = '<existing id>';
```

| ☐ | Attempt | Expected |
| - | ------- | -------- |
| ☐ | `UPDATE` as `authenticated` (REST) | Denied — no UPDATE policy, and `UPDATE` is revoked from the role |
| ☐ | `DELETE` as `authenticated` (REST) | Denied — no DELETE policy, and `DELETE` is revoked |
| ☐ | `UPDATE` in the SQL editor (service role / BYPASSRLS) | **Exception:** `audit_logs is append-only: UPDATE is not permitted` |
| ☐ | `DELETE` in the SQL editor (service role / BYPASSRLS) | **Exception:** `audit_logs is append-only: DELETE is not permitted` |
| ☐ | `TRUNCATE public.audit_logs` | Review the outcome — row triggers do not fire on TRUNCATE. Note the result: _________________ |
| ☐ | Row count before vs. after all attempts | Unchanged |
| ☐ | `INSERT` via the server path | Still works — append is the only permitted operation |

---

## 12. Mobile responsiveness

Test at 320 px, 375 px, 768 px and 1024 px, portrait and landscape. Use a real
device or phone/tablet emulation.

| ☐ | Screen | Check | Expected |
| - | ------ | ----- | -------- |
| ☐ | Login | 320 px width | No horizontal scroll; form fully usable |
| ☐ | Login | Tap targets | Comfortable hit areas; inputs not clipped |
| ☐ | Login | On-screen keyboard open | Submit button reachable; layout does not break |
| ☐ | Login | Email field | Triggers the email keyboard; password is masked |
| ☐ | Login | Error message | Visible without scrolling |
| ☐ | Dashboard | 320 px width | No horizontal scroll; cards reflow to one column |
| ☐ | Dashboard | Sidebar | Collapses to a mobile-appropriate pattern; reachable and dismissible |
| ☐ | Dashboard | Role badge & sign out | Visible and usable on small screens |
| ☐ | Dashboard | 768 px / 1024 px | Layout adapts cleanly at each breakpoint |
| ☐ | Both | Text contrast | Readable; meets WCAG AA |
| ☐ | Both | Keyboard-only navigation | Logical focus order; visible focus rings |
| ☐ | Both | 200% browser zoom | No overlap or clipped content |

---

## 13. 🔴 Secret key isolation

The single most important check before release. `SUPABASE_SECRET_KEY` bypasses
RLS entirely, so it must never leave the server.

```bash
# 1. The secret must not appear in ANY client bundle.
grep -r "$(grep '^SUPABASE_SECRET_KEY=' .env.local | cut -d= -f2-)" .next/static/ && echo "LEAK" || echo "clean"

# 2. The variable name must not be inlined into client code either.
grep -rn "SUPABASE_SECRET_KEY" .next/static/ && echo "LEAK" || echo "clean"

# 3. Only admin.ts may read it.
grep -rn "SUPABASE_SECRET_KEY" src/
```

| ☐ | Check | Expected |
| - | ----- | -------- |
| ☐ | Secret value in `.next/static/**` | **Absent** — any hit is a critical leak |
| ☐ | `SUPABASE_SECRET_KEY` name in `.next/static/**` | **Absent** |
| ☐ | `grep -rn "SUPABASE_SECRET_KEY" src/` | Exactly one file: `src/lib/supabase/admin.ts` |
| ☐ | `src/lib/supabase/admin.ts` first line | `import "server-only"` |
| ☐ | `src/lib/auth/session.ts`, `src/lib/auth/audit.ts` first line | `import "server-only"` |
| ☐ | Add a temporary `import { createAdminClient } from "@/lib/supabase/admin"` to a `"use client"` component, then `npm run build` | **Build fails** — `server-only` blocks it. Remove the import afterwards |
| ☐ | Any `NEXT_PUBLIC_` prefix on the secret | **Never** — that would inline it into the browser bundle |
| ☐ | View source / devtools → Sources on login and dashboard | Only the URL and publishable key are present |
| ☐ | Network tab, all requests | No secret key in any header or payload |
| ☐ | `git log -p` and `git grep` for key-shaped strings | No real credentials ever committed |
| ☐ | `.env.local` | Git-ignored (§0.2) |
| ☐ | `.env.example` | Contains variable **names only**, all values blank |
| ☐ | Secret key rotated after testing if it ever touched a shared machine | Rotated |

---

## 14. Phase 1 scope confirmation

| ☐ | Check | Expected |
| - | ----- | -------- |
| ☐ | No Trips UI, routes or tables | Confirmed — Phase 3 |
| ☐ | No Assignments UI, routes or tables | Confirmed — Phase 4 |
| ☐ | No user-management CRUD UI | Confirmed — Phase 2 |
| ☐ | App is `noindex` | `<meta name="robots" content="noindex">` present in the root layout |
| ☐ | `CAPABILITIES` in `roles.ts` | Exactly the four Phase 1 capabilities |
| ☐ | Enums in sync: DB ↔ `roles.ts` ↔ `database.types.ts` | Identical vocabularies |

---

## Sign-off

| Section | Result | Notes |
| ------- | ------ | ----- |
| 0. Environment & accounts | ☐ | |
| 1. Migrations (incl. 🔴 search_path) | ☐ | |
| 2. First ADMIN bootstrap (incl. 🔴 §2.1) | ☐ | |
| 3. Login | ☐ | |
| 4. Invalid login | ☐ | |
| 5. Logout | ☐ | |
| 6. Inactive account | ☐ | |
| 7. Role permissions (all four roles) | ☐ | |
| 8. 🔴 RLS negative tests | ☐ | |
| 9. 🔴 Privilege escalation | ☐ | |
| 10. Audit inserts | ☐ | |
| 11. 🔴 Audit immutability | ☐ | |
| 12. Mobile responsiveness | ☐ | |
| 13. 🔴 Secret key isolation | ☐ | |
| 14. Phase 1 scope | ☐ | |

**Phase 1 acceptance:** ☐ PASS ☐ FAIL

Tester: _________________ Date: _________________

> Phase 1 is accepted only when every 🔴 security-critical section passes.
> A failure in §2.1, §8, §9, §11 or §13 blocks release outright.
