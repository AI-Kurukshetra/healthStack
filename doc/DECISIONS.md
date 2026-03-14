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

## 2026-03-14 - Public Landing Experience at Root Route
- Decision: Keep `/` as a server-rendered landing page for unauthenticated visitors and redirect authenticated users to `/dashboard`.
- Rationale: This supports product marketing/discovery and onboarding entry points without weakening existing protected-route behavior for signed-in sessions.

## 2026-03-14 - Seed Strategy with Faker + Service Role
- Decision: Implement seeding as a Node script (`supabase/seed.mjs`) using `@faker-js/faker`, `supabase.auth.admin.createUser`, and service-role table inserts instead of SQL-only fixtures.
- Rationale: The MVP schema references `auth.users` across multiple tables, so programmatic seeding keeps relational links valid while generating realistic, role-aware test data at adjustable volumes.

## 2026-03-14 - UI Flow Consolidation for MVP Journeys
- Decision: Keep `/` as the public entry point and explicitly connect landing -> auth -> dashboard -> patient/provider feature routes through persistent navigation links and journey cards.
- Rationale: The MVP already has implemented core capabilities; reducing navigation ambiguity improves task completion speed and makes API-backed flows discoverable without adding new backend scope.

## 2026-03-14 - Operational Page Consistency Pattern
- Decision: Standardize patient and provider operational pages to start with compact workflow summary cards before detailed lists/actions.
- Rationale: Leading with key counts/statuses improves scanability and aligns decision-making on high-frequency pages (`/patient/appointments`, `/provider`) without changing data contracts.

## 2026-03-14 - Authenticated Visual System Alignment
- Decision: Align all authenticated routes to the same aesthetic system as `/` (warm base background, cyan accents, soft glass cards, and consistent section hierarchy) rather than default shadcn monochrome styling.
- Rationale: This removes abrupt visual context shifts between marketing and product surfaces, improving perceived quality and navigation confidence without altering feature behavior.

## 2026-03-14 - ISO Datetime Offset Compatibility
- Decision: Standardize API/domain timestamp validation on `z.string().datetime({ offset: true })` instead of strict `Z`-only datetime parsing.
- Rationale: Supabase/Postgres `timestamptz` can be serialized with timezone offsets (for example `+00:00`), and strict `Z` parsing caused runtime validation failures in dashboard/API record mapping.

## 2026-03-14 - Seeder Slot Uniqueness Guard
- Decision: Enforce uniqueness in generated provider slots inside the seed script before insert.
- Rationale: Randomized slot generation can collide on `(provider_id, starts_at, ends_at)` and fail the seed run against remote Supabase due to `uq_provider_availability_unique_slot`.

## 2026-03-14 - Auth Surface Visual Parity
- Decision: Keep login/register pages and form components on the same visual system as landing/dashboard (shared background treatment, card depth, input styling, and CTA color language).
- Rationale: Auth is a high-frequency first impression; visual parity reduces perceived fragmentation between public and authenticated experiences.

## 2026-03-14 - Password Recovery Visual Consistency
- Decision: Align forgot-password UI (`/forgot-password`) to the same split-panel auth shell and branded form styling used by login/register.
- Rationale: Password recovery is part of the same auth journey, so consistent visual language improves trust and reduces UX fragmentation during account access workflows.

## 2026-03-14 - Route Handler Export Boundary (Availability Route)
- Decision: Move appointment-availability business handler exports to `app/api/appointments/availability/handlers.ts` and keep `route.ts` limited to `GET` export.
- Rationale: Next.js App Router route modules reject non-HTTP exports during type generation; separating handlers preserves testability without violating route export constraints.

## 2026-03-14 - Public Pricing Route Behavior
- Decision: Introduce `/pricing` as a public marketing route and exclude it from the authenticated-user auto-redirect list used for auth-entry pages.
- Rationale: Pricing should remain publicly browsable by both anonymous and signed-in users, while login/register/forgot-password continue redirecting authenticated users to `/dashboard`.

## 2026-03-14 - Auth Right-Panel Readability Adjustment
- Decision: Use a lighter right-side form panel treatment on auth split layouts and increase input-field contrast/focus visibility across auth forms.
- Rationale: The prior right panel and field surfaces reduced readability; stronger contrast and clearer focus states improve form completion and accessibility.

## 2026-03-14 - Auth Right-Panel Wrapper Simplification
- Decision: Remove decorative right-side form-card wrappers from split auth pages while retaining the lighter panel background.
- Rationale: The extra wrapper layer added unnecessary visual weight; removing it keeps the layout cleaner and makes form content feel more direct.

## 2026-03-14 - Custom Auth Input Standardization
- Decision: Introduce a dedicated `AuthInput` wrapper component and use it across all auth form fields.
- Rationale: Centralizing auth input styles ensures consistent custom visuals and avoids repeated per-field class overrides.

## 2026-03-14 - Auth Edge-Route Visual Unification
- Decision: Apply the same split auth layout and right-panel content styling to `/sign-up-success`, `/update-password`, and `/auth/error`.
- Rationale: These routes are part of the same authentication journey and should not revert to the older centered-card pattern.

## 2026-03-14 - Provider Consolidated Patients Dashboard
- Decision: Add `/provider/patients` as a provider-only consolidated view for patient roster, appointment history, and clinical-note history.
- Rationale: Providers requested a single operational dashboard to review patient context and activity without switching between multiple pages.

## 2026-03-14 - Single Register-Onboarding Progression
- Decision: Make onboarding the first destination after registration for both signup outcomes (instant session and email-confirm path).
- Rationale: This removes dashboard detours and enforces one clear register -> onboarding progression before normal app usage.

## 2026-03-14 - Multi-Tenant Rollout Strategy (Phase 1)
- Decision: Introduce tenant architecture in two phases, starting with schema and RLS foundations (`organizations`, memberships, `organization_id` keys, tenant membership predicates) before enforcing tenant context in every API mutation/query.
- Rationale: This minimizes feature regression risk while establishing the non-negotiable data-isolation baseline required for white-label expansion.

## 2026-03-14 - Multi-Tenant Rollout Strategy (Phase 2)
- Decision: Enforce explicit organization context in high-risk clinical APIs first (`patients` write, `appointments`, `encounters`, `medical-records`) while keeping a legacy fallback path in repository-abstracted unit tests.
- Rationale: This secures core data mutation/read boundaries quickly without destabilizing existing test harnesses; non-critical routes can be upgraded next.

## 2026-03-14 - Auth Split Layout Balance
- Decision: Remove right-panel form cards on auth routes and center left-panel content blocks to reduce visual imbalance in the split layout.
- Rationale: Card framing on one side plus unconstrained hero panel on the other created uneven weight; flatter form presentation and centered left content produce a cleaner, more consistent auth experience.

## 2026-03-14 - Onboarding Gate for Tenant Completion
- Decision: Enforce a middleware gate that routes authenticated users without organization memberships to `/onboarding` before allowing dashboard feature routes.
- Rationale: Multi-tenant isolation is only meaningful when user-to-organization binding exists; this gate makes tenant context mandatory before clinical operations.

## 2026-03-14 - Onboarding Membership Check Placement
- Decision: Remove API-level pre-check for existing memberships in onboarding handler and rely on middleware route gating to determine onboarding eligibility.
- Rationale: The pre-check introduced avoidable failure points; middleware already enforces onboarding entry conditions, while API keeps only critical validations (auth, slug uniqueness, create operations).

## 2026-03-14 - Seeder Backward Compatibility During Tenant Rollout
- Decision: Make `supabase/seed.mjs` detect tenant-table availability and seed one organization + memberships only when migrated tables exist; otherwise continue non-tenant seeding.
- Rationale: This keeps seeding operational across environments that are at different migration states while still validating tenant-aware data paths where available.

## 2026-03-14 - Platform Admin Dashboard Visibility
- Decision: Treat `user_metadata.role = admin` as a platform-level super user that can bypass onboarding membership gate and access a dedicated `/organizations` dashboard backed by server-side service-role reads.
- Rationale: Admin oversight requires cross-tenant visibility that tenant-scoped RLS intentionally restricts for regular members.

## 2026-03-14 - Owner/Admin Organization Read Scope
- Decision: Extend RLS read access so organization `owner`/`admin` memberships can read organization-scoped `patients`, `appointments`, `encounters`, and `clinical_notes`, and update provider patients dashboard to use organization-scope for those roles.
- Rationale: Organization leadership needs full patient operational visibility within their tenant without granting platform-wide privileges.

## 2026-03-14 - Supabase Signup Redirect Base URL Resolution
- Decision: Resolve sign-up confirmation `emailRedirectTo` base URL from `NEXT_PUBLIC_SITE_URL` (or `SITE_URL`) before falling back to request origin.
- Rationale: In some environments, request-origin can be untrusted or not in Supabase allow-list, causing sign-up failures with redirect-url errors.

## 2026-03-14 - Actionable Signup Error Mapping
- Decision: Add explicit auth error mappings for redirect URL allow-list failures, disabled signups, and auth DB user-creation failures.
- Rationale: Generic signup failure messages slowed diagnosis; explicit error codes/messages make Supabase configuration issues immediately actionable.

## 2026-03-14 - Auth Navigation Copy and Status Alignment
- Decision: Standardize split-auth secondary navigation copy to a concise `Back` CTA and center-align status-state right-panel content on `/sign-up-success` and `/auth/error`, while keeping canonical login links on `/login`.
- Rationale: The shorter CTA and centered status messaging improve scanability/consistency across auth routes without changing route behavior.

## 2026-03-14 - Onboarding Writes via Admin Client
- Decision: Execute organization slug uniqueness checks and organization/membership creation in onboarding via server-side admin Supabase client after verifying authenticated user identity.
- Rationale: RLS prevents unaffiliated users from reliably querying organizations, which can mask slug collisions and cause generic create failures; admin-path writes keep onboarding deterministic while preserving auth gating.

## 2026-03-14 - Sidebar-First Dashboard Shell
- Decision: Move authenticated dashboard navigation to a sidebar-first shell with role-aware items and active-route highlighting.
- Rationale: As role surfaces grew (patient/provider/admin), top-nav became crowded; sidebar navigation improves clarity and scale.

## 2026-03-14 - Platform Admin All-Patients Workspace
- Decision: Add `/admin/patients` for platform admins, backed by service-role reads, to provide cross-organization patient visibility in one place.
- Rationale: Platform admin responsibilities require a global patient directory that tenant-scoped provider views cannot provide.

## 2026-03-14 - Organization Directory Search/Pagination + Patient History Drill-Down
- Decision: Implement server-side URL-parameter-driven organization browsing (`q`, `page`) and add patient drill-down routing from provider patient list to `/provider/patients/[patientId]` for focused history review.
- Rationale: Organization lists will grow and need discoverability controls, and patient-level history access reduces scanning friction versus reading mixed lists on a single dashboard page.

## 2026-03-14 - Admin Patient Directory Search/Pagination
- Decision: Add URL-parameter-driven server-side filtering and pagination to `/admin/patients` using `q` and `page`, with 10-row pages.
- Rationale: The patient directory will continue to grow; searchable and paged listing keeps it performant and easier to operate for platform admins.

## 2026-03-14 - Destructive Seed Runs Must Be Explicit
- Decision: Keep normal seeding non-destructive, and require `SEED_CLEAR_DATABASE=true` for destructive clear-and-reseed behavior.
- Rationale: This prevents accidental production data wipes while still enabling one-command environment resets when explicitly requested.

## 2026-03-14 - Platform Admin Seed Is Deterministic
- Decision: Always ensure a deterministic platform admin account during seeding, with identity fields sourced from env (`PLATFORM_ADMIN_*`) and `role=admin`.
- Rationale: Admin access validation and demos require a stable operator account; env-driven identity avoids hardcoding sensitive credentials in source.

## 2026-03-14 - Admin Patient Card Drill-Down Behavior
- Decision: Make `/admin/patients` cards navigable to `/admin/patients/[patientId]` and render full patient details with appointment and clinical-history context.
- Rationale: Card click-through removes friction and aligns the admin directory with the expected detail-first workflow for reviewing patient history.

## 2026-03-14 - Admin Patient Directory Uses Table Layout
- Decision: Replace card-stacked patient directory rows in `/admin/patients` with a table-style layout for denser, scan-friendly operational details.
- Rationale: Platform admins need quick cross-row comparison (DOB, org, counts, created date), which is more efficient in tabular structure than cards.

## 2026-03-14 - Patient Role Bypasses Organization Onboarding Gate
- Decision: Enforce `/onboarding` membership redirect only for `provider` and `unknown` roles; skip it for `patient` and platform `admin`.
- Rationale: Patient-role users should not be blocked by organization onboarding and were incorrectly being redirected to `/onboarding`.

## 2026-03-14 - Desktop Sidebar Must Stay Fixed
- Decision: Use a fixed-position sidebar on desktop (`lg:fixed`) and shift main content with left padding to avoid sidebar movement during page scroll.
- Rationale: Keeping navigation static improves orientation and meets explicit UX requirement for a non-scrollable, always-available sidebar.

## 2026-03-14 - Tokenized Admin Patient Search
- Decision: Use tokenized search terms (up to 3 tokens) for admin patient directory filters and include organization name/slug matching by resolving candidate organization IDs first.
- Rationale: Single-string search made full-name queries appear broken; tokenized matching improves discoverability while keeping query complexity bounded.

## 2026-03-14 - Patient Prescription Upload Model
- Decision: Implement patient prescription uploads with Supabase Storage bucket `patient-prescriptions` plus a relational metadata table `public.patient_prescriptions`, exposed through a patient-only API endpoint (`/api/prescriptions`).
- Rationale: Clinical attachments need durable file storage with auditable metadata and tenant/patient access controls; splitting blob storage from relational metadata keeps authorization and listing behavior explicit.

## 2026-03-14 - Route Handler Test Import Boundary
- Decision: Keep `route.ts` files limited to HTTP method exports and import testable business handlers from sibling `handlers.ts` modules.
- Rationale: Next App Router enforces strict route module exports; direct helper exports from route files break production type generation/build.

## 2026-03-14 - Default Organization Membership on User Creation
- Decision: Add a database trigger on `auth.users` to auto-create a default-organization membership for newly registered users and backfill existing users without memberships.
- Rationale: Tenant-scoped APIs require organization membership (`ORG_CONTEXT_REQUIRED` otherwise); enforcing membership at auth-user creation prevents role flows (including patient uploads) from failing due to missing tenant context.

## 2026-03-14 - Platform Admin Prescription Upload-on-Behalf
- Decision: Allow `admin` role to upload prescriptions on behalf of a patient by providing `patientId` to `/api/prescriptions`, and route uploaded files under the target patient's storage namespace.
- Rationale: Platform operations need admin-assisted uploads while preserving patient access to uploaded files in their own records view.

## 2026-03-14 - No Visible Raw IDs in Dashboard UI
- Decision: Remove visible raw identifiers (patient IDs, encounter IDs, and ID-centric labels) from dashboard-facing UI copy while preserving internal routing and data keys.
- Rationale: Operational users requested identifier-free presentation; IDs remain internal for authorization/routing but should not be exposed in page copy.

## 2026-03-14 - Provider Without Membership Must Not Create Organization
- Decision: For provider-role users with no organization membership, route to a dedicated waiting page (`/awaiting-organization`) instead of onboarding, and restrict organization creation to owner/admin memberships or platform admin role.
- Rationale: Provider accounts should be assigned to an organization by admins rather than self-provisioning a new tenant.

## 2026-03-14 - Super Admin Clinical Note Org Fallback
- Decision: Allow super-admin clinical note create/update to resolve organization context from target encounter/note when membership-derived organization context is missing.

## 2026-03-14 - API Contract Documentation Source
- Decision: Maintain a single API reference at `doc/API.md` that documents all App Router endpoints (`app/api/*`) including request/response envelopes, role/auth access behavior, and known error codes.
- Rationale: Consolidated API contracts reduce implementation ambiguity for frontend and integration work and provide a stable handoff artifact as route handlers evolve.

## 2026-03-14 - Swagger Delivery Model
- Decision: Expose OpenAPI via a server-side JSON endpoint (`/api/docs`) and serve Swagger UI as a public app page (`/docs`) powered by `swagger-ui-react`.
- Rationale: This keeps interactive API docs in-app for developers and QA while preserving a machine-readable contract endpoint that can be consumed by tooling.

## 2026-03-14 - Swagger Reliability Adjustment
- Decision: Serve Swagger UI using `url: /api/docs` and avoid custom client-side spec-fetch state management.
- Rationale: Direct URL mode is more robust and prevents UI hangs where the page remains on a loading placeholder despite spec endpoint availability.
- Rationale: Platform admins may not have tenant memberships in all cases, but still need operational ability to add clinical notes from admin patient workflows.

## 2026-03-14 - Admin Clinical Note Entry Model
- Decision: Permit platform admin users to create/update clinical notes through the same medical-records API pathway as providers, with encounter/org validation retained and provider-ownership constraint applied only to provider-role actors.
- Rationale: Admin workflow requires operational note entry for patient support while maintaining encounter-linked data integrity and existing provider constraints.

## 2026-03-14 - Bulk Organization Assignment Utility
- Decision: Add a one-off admin utility (`supabase/assign-organization.mjs`) to backfill organization memberships for all auth users and set `patients.organization_id` consistently to a target organization.
- Rationale: Tenant onboarding/state drift blocked role-gated patient workflows for seeded users; a deterministic bulk assignment restores consistent tenant context quickly.

## 2026-03-14 - UUID-Safe Patient Directory Search
- Decision: Use `ilike` only on text columns and use exact equality filters for UUID tokens on `id`/`user_id` in patient-directory search.
- Rationale: Postgres rejects `ilike` on UUID columns, which caused search queries to fail and return no results.

## 2026-03-14 - Admin Clinical Note UI Must Stay Visible
- Decision: Keep admin clinical-note form always rendered in patient details; when no eligible encounters exist, show explicit warning and disable controls instead of hiding the section.
- Rationale: Hidden sections make it unclear whether feature access exists; visible disabled state communicates availability and next action clearly.

## 2026-03-14 - README Product Positioning
- Decision: Include concise top-level README sections for product name, functional summary, and competitive alternative framing.
- Rationale: Improves first-read clarity for stakeholders and quickly communicates market positioning without requiring deep code/docs review.
