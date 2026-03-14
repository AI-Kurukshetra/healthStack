# DECISIONS

## 2026-03-14 - MVP Scope Source of Truth
- Decision: Use `healthie_blueprint_20260309_193052.pdf` as the baseline for MVP scope, and codify requirements in `/doc/PRD.md` with explicit FR/NFR numbering.
- Rationale: The implementation-readiness assessment found missing PRD artifacts; this establishes traceable scope and requirements for subsequent epic/story and UX planning.

## 2026-03-14 - Planning Artifact Locations for IR
- Decision: Keep canonical planning docs in `/doc` and mirror IR-discoverable copies to `_bmad-output/planning-artifacts/` using `epics-stories.md` and `ux-design.md`.
- Rationale: The IR workflow scans planning artifacts by filename patterns (`*epic*`, `*ux*`); mirroring avoids false "missing artifact" results while preserving `/doc` as project context source.

## 2026-03-14 - Initial App Bootstrap Strategy
- Decision: Initialize from Next.js `with-supabase` starter, then normalize into the project’s canonical shape (`app/(auth)`, `app/(dashboard)`, `middleware.ts`, API route skeletons, and Zod validation stubs).
- Rationale: This preserves secure Supabase SSR auth defaults while accelerating alignment to AGENTS.md architecture and reducing manual setup drift.

## 2026-03-14 - Framework Version Pin for Canonical Stack
- Decision: Pin `next` and `eslint-config-next` to `15.5.7` (instead of `latest`) during setup.
- Rationale: AGENTS.md defines Next.js 15 as canonical; pinning to a maintained 15.x patch avoids major-version drift while keeping build/type tooling stable.

## 2026-03-14 - Auth Foundation Boundary for E1-S1
- Decision: Build the first auth story around a canonical `app/api/auth/route.ts` boundary plus the existing Supabase SSR helpers, while keeping the scaffolded public route names (`/login`, `/register`, `/forgot-password`, `/update-password`, `/sign-up-success`) stable for now.
- Rationale: `FR-008` requires an auth API surface, and keeping current routes avoids unnecessary churn while `E1-S1` focuses on session establishment and protected-route enforcement.

## 2026-03-14 - Patient Onboarding Persistence Shape for E1-S2
- Decision: Persist patient onboarding in a single `public.patients` table keyed by `user_id` (`auth.users.id`) and expose self-service profile retrieval/update through `/api/patients` with upsert semantics.
- Rationale: `FR-001` and `FR-009` require profile create/update/retrieve with role-safe isolation; `user_id` uniqueness and RLS owner policies provide minimal, auditable MVP behavior without introducing multi-record profile complexity.

## 2026-03-14 - Role Source for E1-S3 Authorization
- Decision: Use Supabase `user_metadata.role` as the initial role source for provider gating, with centralized helpers in `lib/auth/roles.ts` and explicit 401/403 enforcement in provider-only APIs.
- Rationale: This enables immediate role-based access control for MVP provider workflows without introducing an additional profile table dependency before dedicated provider domain modeling.

## 2026-03-14 - Appointment Availability Model for E2-S1
- Decision: Introduce `provider_availability_slots` as the canonical source for bookable windows and expose read access through `/api/appointments/availability` with optional date filtering.
- Rationale: `FR-002`/`FR-010` need a provider slot model before appointment creation logic; separating availability from appointments enables clear “slots visible” and “no slots” UX states in patient scheduling.

## 2026-03-14 - Appointment Lifecycle State Model for E2-S2
- Decision: Store scheduling outcomes in a dedicated `public.appointments` table (`confirmed`/`cancelled` statuses) and drive slot occupancy by toggling `provider_availability_slots.is_available` during book/reschedule/cancel actions.
- Rationale: This keeps slot inventory authoritative while preserving an auditable appointment lifecycle required by `FR-002` and `FR-010`.

## 2026-03-14 - Dashboard Read Model for E2-S3/E2-S4
- Decision: Render provider and patient queues directly from appointments data in RSC pages, with provider queue filtered to upcoming windows and patient view split into upcoming vs history/cancelled groups.
- Rationale: Story acceptance criteria require chronological provider queue and clear patient visibility into future versus past appointment states without adding extra API/UI complexity.

## 2026-03-14 - Encounter Lifecycle Model for E3-S1
- Decision: Model encounter lifecycle in a dedicated `public.encounters` table with `active` → `connected` → `completed` states, started by provider and joined by patient via `/api/encounters`.
- Rationale: This maps directly to `FR-003`/`FR-010` acceptance criteria while preserving a durable, role-authorized timeline independent of appointment status rows.

## 2026-03-14 - Route Handler Export Boundary
- Decision: Keep Next.js route files (`app/api/**/route.ts`) restricted to HTTP method exports and move test-target business handlers into sibling `handlers.ts` files.
- Rationale: Next.js 15 route type generation fails when extra exports are present; isolating handlers preserves unit-testability and typecheck stability.

## 2026-03-14 - Video Session Integration Boundary for E3-S2
- Decision: Implement video consultation as a secure, role-authorized session-link layer (`/api/encounters/session`) and a dedicated protected page boundary (`/encounters/[encounterId]/video`) without binding to a vendor SDK yet.
- Rationale: This satisfies MVP join-flow acceptance criteria while deferring provider-specific media SDK selection to a later iteration.

## 2026-03-14 - Patient Schema Reconciliation for Drifted Environments
- Decision: Add a forward-only idempotent migration to reconcile `public.patients` structural prerequisites (`user_id` conflict target, trigger, and RLS policies) instead of editing the original migration.
- Rationale: Some environments may already have a `patients` table from earlier iterations where `create table if not exists` skipped constraint creation, causing `upsert(... onConflict: "user_id")` to fail at runtime.

## 2026-03-14 - Clinical Documentation Storage Shape for E3-S3/E3-S4
- Decision: Use a single `public.clinical_notes` row per encounter (unique `encounter_id`) with mutable `content`, `note_type`, and incrementing `version` as the MVP clinical-document model surfaced through `/api/medical-records`.
- Rationale: This satisfies FR-004/FR-011 requirements for provider create/update and patient-authorized record summary retrieval with minimal schema complexity while preserving audit metadata (`version`, `created_at`, `updated_at`).

## 2026-03-14 - Audit Logging Write Model for E4-S1
- Decision: Implement auditable events through a dedicated `public.audit_logs` table and a shared best-effort server helper (`lib/audit/log.ts`) invoked by auth, appointment, and medical-record mutation handlers.
- Rationale: This satisfies FR-012/NFR-007 traceability while preventing operational regressions by ensuring core user mutations do not fail if audit insertion is temporarily unavailable.

## 2026-03-14 - RLS Validation Strategy for E4-S2
- Decision: Add automated migration-contract tests (`tests/integration/rls-policy-contract.test.ts`) that assert required RLS enablement and policy identifiers for protected tables.
- Rationale: This provides lightweight, repeatable verification of policy intent in CI without requiring a live Supabase runtime during unit/integration test execution.

## 2026-03-14 - CI Gate Structure for E4-S3
- Decision: Gate every push/PR with `pnpm lint`, `pnpm typecheck`, and `pnpm test`, and expose E2E flow execution as a `workflow_dispatch` CI job that accepts auth secrets for authenticated journey validation.
- Rationale: This keeps default CI fast/reliable while still enabling full critical-flow validation when environment prerequisites are available.
