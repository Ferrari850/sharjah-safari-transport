# Sharjah Safari Transport Management System

Internal transport management web application for **Sharjah Safari** (EPAA).
Built with Next.js 16 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui, and
Supabase (PostgreSQL + Auth + Row Level Security).

> **Phase 1 — Foundation.** Authentication, role-based access control, the
> `profiles` / `drivers` / `audit_logs` data model with RLS and an append-only
> audit trail, a professional login page, and a protected dashboard.
> Trips and Assignments are intentionally not built yet.

See **[CLAUDE.md](./CLAUDE.md)** for full architecture, coding standards,
database rules, security rules, roles, and phases.

## Quick start

```bash
cp .env.example .env.local     # add your Supabase URL + keys
npm install
npm run dev                    # http://localhost:3000
```

### Database

Apply the SQL in `supabase/migrations/` **in order** (Supabase SQL editor or
`supabase db push`). Then create the first administrator following
`supabase/migrations/0005_seed_notes.sql`.

### Environment variables

| Variable                               | Exposed to browser   | Purpose                             |
| -------------------------------------- | -------------------- | ----------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | yes                  | Supabase project URL                |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes                  | Publishable key (protected by RLS)  |
| `SUPABASE_SECRET_KEY`                  | **no — server only** | Privileged ops (bypasses RLS)       |

See [`.env.example`](./.env.example) for the template. Before going live,
work through **[PHASE1_TESTING.md](./PHASE1_TESTING.md)**.

### Password recovery — required Supabase redirect URLs

"Forgot password?" sends a recovery email whose link returns to
`/auth/update-password`. Supabase only honours a `redirectTo` that matches an
entry in **Authentication → URL Configuration → Redirect URLs**; anything else
is silently rewritten to the Site URL, which lands the user on the dashboard
with no way to set a password.

Add one entry per environment (exact paths, no wildcard needed):

| Environment | Redirect URL |
| ----------- | ------------ |
| Production  | `https://<your-production-domain>/auth/update-password` |
| Local dev   | `http://localhost:3000/auth/update-password` |

Also set **Site URL** to the production origin (`https://<your-production-domain>`),
since Supabase falls back to it. If the app is deployed to preview URLs as well,
add `https://<preview-domain>/auth/update-password` — or a wildcard such as
`https://*.vercel.app/auth/update-password` — for those too.

The UI enforces a minimum password length (`MIN_PASSWORD_LENGTH` in
`src/lib/constants/auth.ts`). That is a usability guard only: set the
authoritative minimum under **Authentication → Sign In / Providers** and keep
the two in sync.

## Scripts

```bash
npm run dev      # start dev server
npm run build    # production build (type-checks)
npm run lint     # eslint
npm run start    # run the production build
```

## Roles

`ADMIN` · `TRANSPORT_SUPERVISOR` · `DRIVER` · `MANAGEMENT` — see CLAUDE.md §6.
