# BLOCKERS

No active blockers logged.

[2026-03-14] BLOCKER — $bmad-dev
Problem:   Remote migration apply is blocked because Supabase CLI is not linked to a project; `pnpm dlx supabase db push` returns `Cannot find project ref. Have you run supabase link?`.
Attempted: Ran `pnpm seed` (failed due missing `public.patients`), then attempted remote migration apply via `pnpm dlx supabase db push`.
Needs:     Human-provided Supabase credentials/context to link and push: either run `supabase link --project-ref <ref>` with an access token, or provide `SUPABASE_ACCESS_TOKEN` (and DB password/DB URL) so migrations can be applied, then rerun seeding.
