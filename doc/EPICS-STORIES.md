# EPICS & STORIES - Health Stack MVP

Last updated: 2026-03-14  
Source baseline: `doc/PRD.md` and `healthie_blueprint_20260309_193052.pdf`

## 1. Epic Overview

### Epic 1 - Identity, Access, and Patient Onboarding
User value: Patients and providers can securely sign in and establish profiles required for care workflows.

### Epic 2 - Scheduling and Role-Based Dashboards
User value: Patients can book appointments and both roles can operate from dedicated dashboard experiences.

### Epic 3 - Encounters, Clinical Notes, and Medical Records
User value: Providers can conduct virtual visits and document care with records accessible through the portal.

### Epic 4 - Compliance, Auditability, and Release Readiness
User value: The MVP operates with healthcare-grade security, audit logging, and quality gates.

## 2. Epic 1 Stories

### E1-S1 Initialize Auth Foundation (`FR-008`, `NFR-001`, `NFR-002`, `NFR-003`)
As a user, I want secure authentication so that only authorized users can access protected areas.
Acceptance Criteria:
- Given a new user, when they sign up, then an account is created and session established.
- Given a signed-in user, when they access protected routes, then access is granted by role/session state.
- Given a signed-out user, when they access protected routes, then they are redirected to login.

### E1-S2 Patient Registration Flow (`FR-001`, `FR-009`)
As a patient, I want to complete onboarding so that I can book and attend care sessions.
Acceptance Criteria:
- Given a patient completes intake form, when submitted, then patient profile is persisted.
- Given required fields are missing, when submitting, then validation errors are shown.
- Given a valid profile update, when saved, then updated patient details are retrievable via `/patients`.

### E1-S3 Provider Profile and Role Access (`FR-006`, `FR-009`)
As a provider, I want role-specific access so that I can view clinical workflows.
Acceptance Criteria:
- Given a provider account, when logging in, then provider dashboard route is available.
- Given a non-provider account, when hitting provider-only actions, then access is denied.

## 3. Epic 2 Stories

### E2-S1 Appointment Availability and Slot Model (`FR-002`, `FR-010`)
As a patient, I want to view provider availability so that I can pick a suitable visit time.
Acceptance Criteria:
- Given provider availability exists, when a patient opens scheduling, then available slots are visible.
- Given no available slots, when viewing schedule, then empty-state guidance is displayed.

### E2-S2 Create/Reschedule/Cancel Appointment (`FR-002`, `FR-010`)
As a patient, I want to manage appointments so that I can keep my care schedule current.
Acceptance Criteria:
- Given an open slot, when booking, then appointment is created and reflected in both dashboards.
- Given an existing appointment, when rescheduling, then new time is stored and old slot released.
- Given an appointment, when cancelled, then status updates and users are notified in-app.

### E2-S3 Provider Dashboard Queue (`FR-006`, `FR-010`)
As a provider, I want an upcoming appointments queue so that I can run daily visits efficiently.
Acceptance Criteria:
- Given upcoming appointments, when opening dashboard, then appointments appear in chronological order.
- Given appointment status change, when refreshed, then queue reflects latest status.

### E2-S4 Patient Portal Appointments View (`FR-007`)
As a patient, I want to view my appointments so that I can track upcoming and past visits.
Acceptance Criteria:
- Given patient appointments exist, when opening portal, then upcoming and historical entries are shown.

## 4. Epic 3 Stories

### E3-S1 Encounter Session Lifecycle (`FR-003`, `FR-010`)
As a provider, I want to start encounters from scheduled appointments so that teleconsultations are controlled and traceable.
Acceptance Criteria:
- Given a confirmed appointment, when provider starts encounter, then encounter state changes to active.
- Given active encounter, when patient joins, then both participants are connected.

### E3-S2 Basic Video Consultation Integration (`FR-003`)
As a patient/provider, I want a secure video session so that remote consultation can happen reliably.
Acceptance Criteria:
- Given an active encounter, when join link is opened, then video session launches successfully.
- Given session failure, when join attempt fails, then recoverable error guidance is displayed.

### E3-S3 Clinical Notes (SOAP/Progress) (`FR-004`, `FR-011`)
As a provider, I want structured notes so that encounter details are documented consistently.
Acceptance Criteria:
- Given an encounter, when provider saves note, then note is linked to encounter and patient record.
- Given an existing note, when edited, then latest version is persisted with audit metadata.

### E3-S4 Patient Record Retrieval in Portal (`FR-005`, `FR-007`, `FR-011`)
As a patient, I want to view record summaries so that I can understand my care history.
Acceptance Criteria:
- Given records exist, when patient opens records page, then authorized summaries are visible.
- Given unauthorized access attempt, when requesting another patient record, then access is denied.

## 5. Epic 4 Stories

### E4-S1 Audit Logging for Sensitive Actions (`FR-012`, `NFR-001`, `NFR-007`)
As an operations/compliance stakeholder, I want auditable events so that high-risk actions are traceable.
Acceptance Criteria:
- Given auth/record/appointment mutations, when actions occur, then audit events are recorded with actor and timestamp.

### E4-S2 RLS and Policy Validation (`NFR-001`, `NFR-003`)
As a platform owner, I want policy-level data isolation so that users only access allowed data.
Acceptance Criteria:
- Given patient/provider roles, when querying protected data, then only authorized rows are returned.

### E4-S3 Quality Gates and Critical Tests (`NFR-008`, `NFR-009`, `NFR-004`, `NFR-005`)
As a team, I want automated quality checks so that regressions are prevented before release.
Acceptance Criteria:
- Given a PR branch, when CI runs, then lint, typecheck, and core test suites pass.
- Given critical UX flows, when E2E runs, then auth, scheduling, encounter, and portal paths pass.

## 6. FR to Epic/Story Traceability

| FR | Covered In |
| --- | --- |
| FR-001 | E1-S2 |
| FR-002 | E2-S1, E2-S2 |
| FR-003 | E3-S1, E3-S2 |
| FR-004 | E3-S3 |
| FR-005 | E3-S4 |
| FR-006 | E1-S3, E2-S3 |
| FR-007 | E2-S4, E3-S4 |
| FR-008 | E1-S1 |
| FR-009 | E1-S2, E1-S3 |
| FR-010 | E2-S1, E2-S2, E2-S3, E3-S1 |
| FR-011 | E3-S3, E3-S4 |
| FR-012 | E4-S1 |

## 7. Delivery Sequence
1. Epic 1
2. Epic 2
3. Epic 3
4. Epic 4

No forward dependencies are required if stories are implemented in listed order.
