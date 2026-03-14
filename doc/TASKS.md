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
