# SCHEMA

## Migration History

### `20260314113000_init.sql`
- Type: bootstrap placeholder migration
- DDL/DML: `select 1;` (no schema objects created yet)
- RLS impact: none
- Notes: establishes migration directory + timestamp convention before first real schema migration

### `20260314124500_patients_profile.sql`
- Type: schema + policy migration
- DDL/DML:
  - Creates `public.patients` with `id`, `user_id` (unique FK to `auth.users`), `first_name`, `last_name`, `date_of_birth`, `created_at`, `updated_at`
  - Adds `idx_patients_user_id`
  - Adds `set_updated_at` trigger function and `trg_patients_set_updated_at` trigger
- RLS impact:
  - Enables RLS on `public.patients`
  - Adds owner policies: `patients_select_own`, `patients_insert_own`, `patients_update_own` using `(select auth.uid()) = user_id`
- Notes: supports E1-S2 onboarding intake persistence and self-profile retrieval/update via `/api/patients`

### `20260314130000_provider_availability_slots.sql`
- Type: schema + policy migration
- DDL/DML:
  - Creates `public.provider_availability_slots` with `provider_id`, `starts_at`, `ends_at`, `is_available`, audit timestamps, unique slot constraint, and time-range check constraint
  - Adds indexes on `starts_at` and `provider_id`
  - Adds `trg_provider_availability_set_updated_at` trigger using `public.set_updated_at()`
- RLS impact:
  - Enables RLS on `public.provider_availability_slots`
  - Adds `provider_availability_select_authenticated` policy for authenticated users to view only available slots
  - Adds owner-write policies: `provider_availability_insert_own` and `provider_availability_update_own`
- Notes: supports E2-S1 slot discovery API and patient scheduling UI empty/full availability states

### `20260314133000_appointments.sql`
- Type: schema + policy migration
- DDL/DML:
  - Creates `public.appointments` with `patient_id`, `provider_id`, `slot_id`, time range fields, status check (`confirmed`/`cancelled`), and audit timestamps
  - Adds indexes on `patient_id`, `provider_id`, and `starts_at`
  - Adds `trg_appointments_set_updated_at` trigger using `public.set_updated_at()`
- RLS impact:
  - Enables RLS on `public.appointments`
  - Adds patient/provider read policies (`appointments_select_patient`, `appointments_select_provider`)
  - Adds patient-owned write policies (`appointments_insert_patient`, `appointments_update_patient`)
- Notes: supports E2-S2 lifecycle endpoints (`book`, `reschedule`, `cancel`) and dashboard queue/history views for E2-S3/E2-S4

### `20260314134000_encounters.sql`
- Type: schema + policy migration
- DDL/DML:
  - Creates `public.encounters` with unique `appointment_id`, patient/provider references, lifecycle status (`active`/`connected`/`completed`), join/start timestamps, and audit timestamps
  - Adds indexes on `appointment_id`, `provider_id`, and `patient_id`
  - Adds `trg_encounters_set_updated_at` trigger using `public.set_updated_at()`
- RLS impact:
  - Enables RLS on `public.encounters`
  - Adds provider/patient read policies (`encounters_select_provider`, `encounters_select_patient`)
  - Adds provider insert/update policies and patient update policy for owned encounters
- Notes: supports E3-S1 encounter lifecycle API (`/api/encounters`) and role-scoped encounter status visibility in dashboard appointment queues

### `20260314142000_clinical_notes.sql`
- Type: schema + policy migration
- DDL/DML:
  - Creates `public.clinical_notes` with unique `encounter_id`, role-linked `patient_id`/`provider_id`, `note_type` (`soap`/`progress`), `content`, `version`, and audit timestamps
  - Adds indexes on `patient_id`, `provider_id`, and `updated_at`
  - Adds `trg_clinical_notes_set_updated_at` trigger using `public.set_updated_at()`
- RLS impact:
  - Enables RLS on `public.clinical_notes`
  - Adds read policies for assigned provider (`clinical_notes_select_provider`) and owning patient (`clinical_notes_select_patient`)
  - Adds provider-owned write policies for insert/update (`clinical_notes_insert_provider`, `clinical_notes_update_provider`)
- Notes: supports E3-S3 provider SOAP/progress note create/update and E3-S4 patient-authorized medical record summary retrieval via `/api/medical-records`.

### `20260314145500_audit_logs.sql`
- Type: schema + policy migration
- DDL/DML:
  - Creates `public.audit_logs` with event descriptors (`event_type`, `action`, `resource_type`, optional `resource_id`), actor context (`actor_id`, `actor_role`), request metadata (`request_id`, `metadata`), and timestamps (`occurred_at`, `created_at`)
  - Adds indexes on `occurred_at`, `actor_id`, and `event_type`
- RLS impact:
  - Enables RLS on `public.audit_logs`
  - Adds insert policy (`audit_logs_insert_actor_or_anonymous`) allowing actor-owned or anonymous-safe writes
  - Adds read policy (`audit_logs_select_actor_or_admin`) limiting reads to event owner or admin role
- Notes: supports E4-S1 auditable mutation trail for auth, appointment, and medical-record write operations.

### `20260314161000_multi_tenant_foundation.sql`
- Type: schema + data backfill + policy migration
- DDL/DML:
  - Creates `public.organizations` (tenant root) and `public.organization_memberships` (user-to-org mapping + per-org role).
  - Adds helper functions:
    - `public.is_member_of_org(uuid)` for RLS checks
    - `public.default_organization_id()` for stable fallback/backfill behavior
  - Inserts a default organization (`slug: default-org`) and backfills memberships for existing `auth.users`.
  - Adds `organization_id` to `patients`, `provider_availability_slots`, `appointments`, `encounters`, `clinical_notes`, and `audit_logs`.
  - Backfills tenant IDs for existing rows, then enforces `NOT NULL`, adds FK constraints to `organizations(id)`, and creates supporting indexes.
- RLS impact:
  - Enables RLS on `organizations` and `organization_memberships` with membership-scoped visibility.
  - Rewrites prior policies on patient/scheduling/encounter/clinical-note/audit tables to include tenant membership predicates (`public.is_member_of_org(organization_id)`) in addition to existing ownership/role checks.
- Notes: establishes phase-1 white-label multi-tenant data isolation foundation while preserving backward compatibility via default-org seed and backfill strategy.
- Update note (same migration): tenant-keyed columns now also set column defaults to `public.default_organization_id()` on `patients`, `provider_availability_slots`, `appointments`, `encounters`, `clinical_notes`, and `audit_logs` to preserve backward compatibility for writes that have not yet been tenant-wired.

### `20260314164000_org_onboarding_policies.sql`
- Type: policy migration
- DDL/DML:
  - Adds authenticated insert policy on `public.organizations` (`organizations_insert_authenticated`).
  - Adds authenticated insert policy on `public.organization_memberships` (`organization_memberships_insert_self_or_org_admin`) to allow self membership creation for onboarding and admin/owner membership management.
- RLS impact:
  - Enables onboarding API flows to create organization + owner membership without service-role usage.
- Notes: supports phase-2 multi-tenant onboarding completion for newly signed-up users who do not yet have membership rows.
