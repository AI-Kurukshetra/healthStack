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
