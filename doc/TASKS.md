# TASKS

Legend: `[ ]` todo, `[x]` done, `[~]` in-progress, `[!]` blocked

- [x] [2026-03-14 10:16] Create `/doc/PRD.md` with explicit FR/NFR numbering from approved PDF MVP
- [x] [2026-03-14 10:37] Create epics and stories mapped to PRD FRs
- [x] [2026-03-14 10:37] Create UX specification for patient and provider journeys
- [x] [2026-03-14 10:41] Re-run implementation readiness assessment after required planning artifacts exist
- [x] [2026-03-14 11:25] Start project setup: scaffold Next.js + Supabase baseline, auth/dashboard route groups, API/validation skeletons, and quality gates
- [x] [2026-03-14 11:40] Create implementation-ready BMAD story artifact for `E1-S1 Initialize Auth Foundation`
- [x] [2026-03-14 12:16] Implement `E1-S2 Patient Registration Flow`: persisted intake profile model, `/api/patients` CRUD-on-self flow, and dashboard onboarding form
- [x] [2026-03-14 12:16] Implement `E1-S3 Provider Profile and Role Access` baseline: provider-only dashboard route and provider-only API authorization checks
- [x] [2026-03-14 12:19] Implement `E2-S1 Appointment Availability and Slot Model`: provider availability slot table + RLS, `/api/appointments/availability`, and patient scheduling view with empty-state guidance
- [x] [2026-03-14 12:27] Implement `E2-S2 Create/Reschedule/Cancel Appointment`: `appointments` table + RLS, `/api/appointments` mutation/read flows, and dashboard reflections for patient/provider role views
- [x] [2026-03-14 12:27] Implement `E2-S3 Provider Dashboard Queue`: provider dashboard now renders chronological upcoming queue from appointment records
- [x] [2026-03-14 12:27] Implement `E2-S4 Patient Portal Appointments View`: patient portal now separates upcoming appointments from history/cancelled records
- [x] [2026-03-14 12:30] Implement `E3-S1 Encounter Session Lifecycle`: `encounters` table + RLS, `/api/encounters` start/join/complete lifecycle handlers, and appointment dashboard visibility of encounter status
- [x] [2026-03-14 12:32] Implement `E3-S2 Basic Video Consultation Integration` baseline: secure encounter join-link API at `/api/encounters/session`, protected video session page boundary, and role-scoped session links from appointment views
- [x] [2026-03-14 12:26] Fix patient profile save failures on migrated databases by reconciling `public.patients` constraints/policies with an idempotent migration
- [x] [2026-03-14 12:40] Implement `E3-S3 Clinical Notes (SOAP/Progress)`: `clinical_notes` table + RLS, provider note create/update flows in `/api/medical-records`, and provider clinical-note workspace route
- [x] [2026-03-14 12:40] Implement `E3-S4 Patient Record Retrieval in Portal`: patient-authorized record-summary retrieval via `/api/medical-records` and patient records view at `/patient/records`
- [x] [2026-03-14 12:46] Implement `E4-S1 Audit Logging for Sensitive Actions`: `audit_logs` table + RLS and best-effort event writes for auth, appointment, and medical-record mutations
- [x] [2026-03-14 12:46] Implement `E4-S2 RLS and Policy Validation`: integration contract tests asserting policy/RLS expectations for protected tables and migration coverage
- [x] [2026-03-14 12:46] Implement `E4-S3 Quality Gates and Critical Tests`: CI workflow for lint/typecheck/test and expanded critical Playwright flow coverage for auth/scheduling/encounter/portal routes
