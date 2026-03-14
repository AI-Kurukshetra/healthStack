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

## Quality Checks

```bash
pnpm lint
pnpm typecheck
pnpm test
```

## Project Docs

See `doc/` for PRD, tasks, progress, decisions, changelog, and schema notes.
