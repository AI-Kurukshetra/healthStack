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
