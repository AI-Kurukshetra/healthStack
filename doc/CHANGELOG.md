# CHANGELOG

## 2026-03-14
- Added `/doc/PRD.md` with explicit numbered FR/NFR requirements from approved MVP scope in `healthie_blueprint_20260309_193052.pdf`.
- Initialized `/doc` governance files required by `AGENTS.md` (`TASKS.md`, `PROGRESS.md`, `BLOCKERS.md`, `CHANGELOG.md`, `DECISIONS.md`, `SCHEMA.md`).
- Re-generated `_bmad-output/planning-artifacts/implementation-readiness-report-2026-03-14.md` with explicit PRD FR/NFR extraction from `doc/PRD.md`.
- Added `/doc/EPICS-STORIES.md` with story-level mapping to `FR-001..FR-012` and Given/When/Then acceptance criteria.
- Added `/doc/UX-DESIGN.md` defining patient/provider journeys, screen inventory, states, accessibility, and responsive behavior.
- Mirrored planning docs to `_bmad-output/planning-artifacts/epics-stories.md` and `_bmad-output/planning-artifacts/ux-design.md` for IR workflow discovery.
- Re-generated readiness report with full artifact coverage; status updated to READY.
- Added `_bmad-output/planning-artifacts/prd.md` mirror for IR workflow discovery.
- Bootstrapped application codebase from Next.js `with-supabase` starter into project root while preserving existing `/doc` and `_bmad*` artifacts.
- Added auth and protected route-group baseline: `app/(auth)/*`, `app/(dashboard)/layout.tsx`, `app/(dashboard)/dashboard/page.tsx`, and root redirect flow in `app/page.tsx`.
- Replaced `proxy.ts` flow with `middleware.ts` + `lib/supabase/middleware.ts` session refresh and public/protected route handling.
- Added initial API and server-action skeletons for `/api/auth`, `/api/patients`, `/api/appointments`, `/api/medical-records`, plus `app/actions/*`.
- Added typed validation scaffolds in `lib/validations/*.schema.ts` using Zod, along with `hooks/*`, `types/env.d.ts`, and initial Supabase migration placeholder.
- Added test/tooling baseline: `vitest.config.ts`, `playwright.config.ts`, `lib/utils.test.ts`, `tests/e2e/smoke.spec.ts`, and package scripts (`typecheck`, `test`, `test:e2e`).
- Added `.codex/config.toml` and `.codex/agents/*.toml` role config scaffolding for multi-agent routing.
- Updated framework pins to Next.js `15.5.7` + `eslint-config-next 15.5.7` and fixed compatibility issues (`next.config.ts` normalization, ESLint ignores, route-type compatible auth error page typing).
- Verified project health checks after setup: `pnpm lint` ✓, `pnpm typecheck` ✓, `pnpm test` ✓, `pnpm build` ✓.
- Added `_bmad-output/implementation-artifacts/1-1-initialize-auth-foundation.md` as the first implementation-ready BMAD story artifact, covering auth API contracts, route guards, form refactor targets, and test expectations for `E1-S1`.
