# Health Stack

Health Stack is a Next.js + Supabase virtual care MVP scaffold.

## Prerequisites

- Node.js 20+
- pnpm 10+

## Environment

Copy `.env.example` into `.env.local` and set values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Run

```bash
pnpm install
pnpm dev
```

## Seed Data (Faker)

```bash
pnpm seed
```

Optional env overrides:
- `SEED_PROVIDER_COUNT`
- `SEED_PATIENT_COUNT`
- `SEED_SLOTS_PER_PROVIDER`
- `SEED_APPOINTMENT_COUNT`
- `SEED_ENCOUNTER_COUNT`
- `SEED_NOTE_COUNT`
- `SEED_AUDIT_LOG_COUNT`

## Quality Checks

```bash
pnpm lint
pnpm typecheck
pnpm test
```

## Project Docs

See `doc/` for PRD, tasks, progress, decisions, changelog, and schema notes.
