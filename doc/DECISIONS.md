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
