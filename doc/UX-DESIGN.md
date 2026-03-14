# UX Specification - Health Stack MVP

Last updated: 2026-03-14  
Source baseline: `doc/PRD.md` and `healthie_blueprint_20260309_193052.pdf`

## 1. UX Objectives
- Minimize steps for patient onboarding and appointment booking.
- Keep provider workflow focused on queue -> encounter -> note completion.
- Ensure clear status, loading, and error feedback on every critical path.
- Enforce accessibility and trust cues for healthcare workflows.

## 2. Primary Personas

### Patient Persona
- Goal: Register quickly, book and attend appointments, review records.
- Pain points: Form fatigue, missed scheduling context, uncertainty after actions.

### Provider Persona
- Goal: Manage daily queue, run consultations, complete notes quickly.
- Pain points: Context switching, delayed status updates, documentation overhead.

## 3. Information Architecture

### Public (Auth)
- `/login`
- `/register`
- `/reset-password`

### Patient Area
- `/patient` (overview)
- `/patient/appointments`
- `/patient/records`

### Provider Area
- `/provider` (queue overview)
- `/provider/schedule`
- `/provider/patients`
- `/encounters/[id]`
- `/clinical-notes`

## 4. Key User Journeys

### Journey A - Patient Onboarding and Booking
1. Register account
2. Complete intake/profile
3. View availability
4. Book appointment
5. See confirmation in portal

Success criteria:
- Patient completes booking in one session with clear confirmation.

### Journey B - Provider Consultation Workflow
1. Open provider dashboard queue
2. Start encounter from appointment
3. Conduct video consultation
4. Save clinical notes
5. Close encounter

Success criteria:
- Provider can complete encounter and note in a single continuous flow.

### Journey C - Patient Record Review
1. Open patient portal records
2. View summary of encounter notes/records
3. Confirm most recent update is visible

Success criteria:
- Patient can find recent care summary quickly without support.

## 5. Screen Inventory and Requirements

### Auth Screens
- Login
- Register
- Reset Password
Requirements:
- Clear field validation
- Recovery links
- Accessible labels and keyboard navigation

### Patient Screens
- Patient dashboard overview
- Appointments list/detail
- Booking/reschedule/cancel flow
- Records summary list
Requirements:
- Persistent appointment status badges
- Empty states with next-action guidance
- Explicit success/error toasts

### Provider Screens
- Provider queue dashboard
- Schedule management
- Patient context panel
- Encounter room view
- Clinical note editor
Requirements:
- Queue sorted by appointment time
- Fast context access before encounter
- Autosave or clear save status for notes

## 6. Interaction and State Rules

### Loading States
- Show skeletons for page-level data fetches.
- Disable submit buttons during mutation.

### Error States
- Render inline field errors for validation issues.
- Render page-level error blocks for fetch failures.
- Provide retry action where recoverable.

### Success States
- Confirmation message after booking, cancellation, and note save.
- Updated status reflected immediately in corresponding list views.

## 7. Accessibility Baseline
- Semantic headings and landmarks.
- Keyboard operability for all core actions.
- Label every form control.
- Visible focus states.
- Color contrast suitable for medical workflow readability.

## 8. Responsive Behavior
- Mobile-first layouts for patient portal and booking flow.
- Tablet/desktop optimization for provider queue and notes workspace.
- Sticky or persistent action bars on small screens for key actions.

## 9. UX-Architecture Alignment Notes
- Journey A aligns to `FR-001`, `FR-002`, `FR-007`, `FR-010`.
- Journey B aligns to `FR-003`, `FR-004`, `FR-006`, `FR-011`.
- Journey C aligns to `FR-005`, `FR-007`, `FR-011`.
- Error/loading/accessibility rules map to `NFR-004`, `NFR-005`, `NFR-008`, `NFR-009`.
