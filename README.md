# Health Stack

Health Stack is a Next.js + Supabase virtual care MVP scaffold.

## Prerequisites

- Node.js 20+
- pnpm 10+

## Environment

Copy `.env.example` into `.env.local` and set values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL` (recommended for auth email redirects, e.g. `http://localhost:3000`)
- `SUPABASE_SERVICE_ROLE_KEY`
- `PLATFORM_ADMIN_EMAIL` (seed target admin email, e.g. `rutvik.patel@bacancy.com`)
- `PLATFORM_ADMIN_PASSWORD` (required for seeding)
- `PLATFORM_ADMIN_FIRST_NAME` (optional, default `Rutvik`)
- `PLATFORM_ADMIN_LAST_NAME` (optional, default `Patel`)

## Run

```bash
pnpm install
pnpm dev
```

## Seed Data (Faker)

```bash
pnpm seed
```

To clear existing data and reseed from scratch:

```bash
pnpm seed:reset
```

Optional env overrides:
- `SEED_PROVIDER_COUNT`
- `SEED_PATIENT_COUNT`
- `SEED_SLOTS_PER_PROVIDER`
- `SEED_APPOINTMENT_COUNT`
- `SEED_ENCOUNTER_COUNT`
- `SEED_NOTE_COUNT`
- `SEED_AUDIT_LOG_COUNT`
- `SEED_ORG_SLUG`
- `SEED_ORG_NAME`

## Quality Checks

```bash
pnpm lint
pnpm typecheck
pnpm test
```

## Project Docs

See `doc/` for PRD, tasks, progress, decisions, changelog, and schema notes.
