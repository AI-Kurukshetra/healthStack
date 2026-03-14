# PRD - Health Stack MVP

Last updated: 2026-03-14  
Source baseline: `healthie_blueprint_20260309_193052.pdf` (approved scope)

## 1. Product Goal
Build an API-first virtual health MVP for a single specialty that enables patient onboarding, scheduling, basic teleconsultation, clinical documentation, and secure patient/provider workflows.

## 2. Scope

### In Scope (MVP)
- Patient registration and onboarding
- Appointment scheduling
- Basic video consultation workflow
- Simple clinical documentation
- Patient portal
- Provider dashboard
- HIPAA-oriented security/compliance baseline
- Core APIs: `/auth`, `/patients`, `/appointments`, `/medical-records`

### Out of Scope (Post-MVP)
- Billing and claims automation
- E-prescribing network integration
- Lab/diagnostic integrations
- AI decision support and predictive analytics
- Advanced multi-tenant white-label controls

## 3. Functional Requirements (FR)

### FR-001 Patient Registration & Onboarding
The system shall allow new patients to register, create an account, complete digital intake details, and create a patient profile.

### FR-002 Appointment Scheduling
The system shall allow patients to view available provider slots and book/reschedule/cancel appointments.

### FR-003 Basic Video Consultation
The system shall allow providers and patients to start and join a HIPAA-appropriate video consultation session for a scheduled encounter.

### FR-004 Clinical Documentation
The system shall allow providers to create and update simple clinical notes (SOAP/progress style) linked to encounters.

### FR-005 Electronic Medical Records Access
The system shall store and retrieve patient medical records relevant to MVP workflows via secure access controls.

### FR-006 Provider Dashboard
The system shall provide providers a dashboard showing upcoming appointments, patient context, and note-taking entry points.

### FR-007 Patient Portal
The system shall provide patients a portal to view appointments, consultation history context, and accessible record summaries.

### FR-008 Authentication API
The system shall provide `/auth` API endpoints for signup/signin/session flows with secure token/session handling.

### FR-009 Patients API
The system shall provide `/patients` API endpoints for patient profile creation, update, and retrieval.

### FR-010 Appointments API
The system shall provide `/appointments` API endpoints for appointment creation, update, cancellation, and retrieval.

### FR-011 Medical Records API
The system shall provide `/medical-records` API endpoints for creating and reading medical record artifacts used by MVP features.

### FR-012 Compliance Logging Baseline
The system shall record auditable events for sensitive actions (auth, record access/update, appointment lifecycle changes).

## 4. Non-Functional Requirements (NFR)

### NFR-001 Security & Compliance
The system shall enforce HIPAA-oriented safeguards including role-based access, secure transport, and auditable access logs.

### NFR-002 Data Protection
The system shall prevent exposure of privileged credentials (for example service-role keys) to client-side code.

### NFR-003 Authorization Model
The system shall enforce row-level authorization policies for protected health data access and mutation.

### NFR-004 Performance Baseline
The platform shall target responsive user interactions and track API response-time metrics for operational monitoring.

### NFR-005 Reliability Baseline
The system shall support operational uptime monitoring and graceful error handling for critical user paths.

### NFR-006 Validation & Data Integrity
All write-path inputs shall be validated via schema-driven validation before persistence.

### NFR-007 Observability
The system shall provide request-level logging and auditable event trails for production troubleshooting and compliance checks.

### NFR-008 Testability
The system shall support automated linting, type-checking, unit tests, and E2E coverage for critical journeys.

### NFR-009 Accessibility Baseline
The UI shall use semantic structure and keyboard-accessible interactions for patient and provider flows.

## 5. API Surface (MVP)
- `POST/GET` `/auth` (auth/session operations)
- `GET/POST/PATCH` `/patients`
- `GET/POST/PATCH/DELETE` `/appointments`
- `GET/POST/PATCH` `/medical-records`

## 6. Primary Users
- Patient users
- Provider users
- Internal operations/admin users (limited MVP controls)

## 7. Success Metrics (MVP)
- Patient onboarding completion rate
- Appointment booking completion rate
- Patient portal adoption
- Provider workflow usability feedback
- API response time and uptime
- Security/compliance incident count

## 8. Constraints
- Stack and implementation conventions must follow `AGENTS.md`.
- Scope must remain limited to the MVP items above unless explicitly expanded.
