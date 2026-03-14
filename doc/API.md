# API Documentation

Last updated: 2026-03-14

This document describes the current App Router API under `app/api/*`.

## Interactive Docs
- Swagger UI: `GET /docs`
- Raw OpenAPI spec (JSON): `GET /api/docs`

## Base URL
- Local: `http://localhost:3000`
- Example: `GET http://localhost:3000/api/patients`

## Authentication
- APIs use Supabase auth session cookies (SSR) from the current browser session.
- Most endpoints return `401 AUTH_REQUIRED` when no authenticated user is present.
- Multi-tenant endpoints also require organization context and return `403 ORG_CONTEXT_REQUIRED` when missing.

## Response Envelope

### Read response
```json
{
  "data": {},
  "meta": {
    "requestId": "<uuid-or-string>"
  }
}
```

### Mutation response
```json
{
  "data": {},
  "message": "Operation completed.",
  "requestId": "<uuid-or-string>"
}
```

### Error response
```json
{
  "error": {
    "code": "SOME_ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  },
  "requestId": "<uuid-or-string>"
}
```

All responses include header `x-request-id`.

## Endpoints

## `GET /api/auth`
Returns current auth session and user.

- Auth: optional (works for signed-in and signed-out)
- Success `200`
```json
{
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "emailConfirmedAt": "2026-03-14T10:00:00+00:00",
      "lastSignInAt": "2026-03-14T10:05:00+00:00"
    },
    "session": {
      "isAuthenticated": true,
      "needsEmailConfirmation": false
    },
    "nextPath": "/dashboard"
  },
  "meta": {
    "requestId": "..."
  }
}
```
- Error codes:
  - `AUTH_SESSION_LOOKUP_FAILED`

## `POST /api/auth`
Performs sign-in, sign-up, or sign-out.

### Request body
```json
{ "action": "sign-in", "email": "user@example.com", "password": "********" }
```
```json
{ "action": "sign-up", "email": "user@example.com", "password": "********" }
```
```json
{ "action": "sign-out" }
```

### Success
- `sign-in`: `nextPath` is `/dashboard`
- `sign-up`:
  - when email confirmation needed: `nextPath` is `/sign-up-success`
  - when session exists immediately: `nextPath` is `/onboarding`
- `sign-out`: returns `{ "success": true, "nextPath": "/login" }`

### Error codes
- `VALIDATION_ERROR`
- `AUTH_INVALID_CREDENTIALS`
- `AUTH_EMAIL_NOT_CONFIRMED`
- `AUTH_SIGN_IN_FAILED`
- `AUTH_ACCOUNT_EXISTS`
- `AUTH_REDIRECT_URL_NOT_ALLOWED`
- `AUTH_SIGN_UP_DISABLED`
- `AUTH_SIGN_UP_DB_ERROR`
- `AUTH_SIGN_UP_FAILED`
- `AUTH_SIGN_OUT_FAILED`
- `AUTH_REQUEST_FAILED`

## `GET /api/patients`
Returns authenticated user’s patient profile.

- Auth: required
- Success `200`: `data` is patient object or `null`

### Patient object
```json
{
  "id": "uuid",
  "userId": "uuid",
  "firstName": "Jane",
  "lastName": "Doe",
  "dateOfBirth": "1995-01-10",
  "createdAt": "2026-03-14T10:00:00+00:00",
  "updatedAt": "2026-03-14T10:00:00+00:00"
}
```

### Error codes
- `AUTH_REQUIRED`
- `PATIENTS_GET_FAILED`

## `POST /api/patients`
Creates or updates authenticated user’s patient profile.

## `PATCH /api/patients`
Same behavior as `POST`.

### Request body
```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "dateOfBirth": "1995-01-10"
}
```

### Error codes
- `AUTH_REQUIRED`
- `VALIDATION_ERROR`
- `ORG_CONTEXT_REQUIRED`
- `PATIENTS_SAVE_FAILED`

## `GET /api/providers`
Provider-only resource placeholder.

- Auth: required
- Role: `provider`
- Success `200`
```json
{
  "data": {
    "queue": [],
    "summary": "Provider dashboard queue placeholder"
  },
  "meta": {
    "requestId": "..."
  }
}
```

### Error codes
- `AUTH_REQUIRED`
- `PROVIDER_ACCESS_DENIED`
- `PROVIDER_QUEUE_FAILED`

## `GET /api/appointments/availability`
Lists available provider slots.

- Auth: required
- Query params:
  - `date` (optional, `YYYY-MM-DD`)

### Success `200`
```json
{
  "data": [
    {
      "id": "uuid",
      "providerId": "uuid",
      "startsAt": "2026-03-15T10:00:00+00:00",
      "endsAt": "2026-03-15T10:30:00+00:00",
      "isAvailable": true
    }
  ],
  "meta": {
    "requestId": "...",
    "count": 1
  }
}
```

### Error codes
- `AUTH_REQUIRED`
- `VALIDATION_ERROR`
- `APPOINTMENT_AVAILABILITY_FAILED`

## `GET /api/appointments`
Lists appointments by role.

- Auth: required
- Role behavior:
  - `patient`: returns appointments for own patient profile
  - `provider`: returns appointments assigned to provider
  - others: denied

### Error codes
- `AUTH_REQUIRED`
- `ORG_CONTEXT_REQUIRED`
- `APPOINTMENTS_ACCESS_DENIED`
- `APPOINTMENTS_READ_FAILED`

## `POST /api/appointments`
Patient appointment mutation endpoint.

## `PATCH /api/appointments`
Same mutation behavior as `POST`.

### Request body variants
```json
{ "action": "book", "slotId": "uuid" }
```
```json
{ "action": "reschedule", "appointmentId": "uuid", "newSlotId": "uuid" }
```
```json
{ "action": "cancel", "appointmentId": "uuid" }
```

### Success `200`
Returns appointment object:
```json
{
  "id": "uuid",
  "patientId": "uuid",
  "providerId": "uuid",
  "slotId": "uuid",
  "startsAt": "2026-03-15T10:00:00+00:00",
  "endsAt": "2026-03-15T10:30:00+00:00",
  "status": "confirmed"
}
```

### Error codes
- `AUTH_REQUIRED`
- `VALIDATION_ERROR`
- `ORG_CONTEXT_REQUIRED`
- `APPOINTMENTS_ACCESS_DENIED`
- `PATIENT_PROFILE_REQUIRED`
- `APPOINTMENT_NOT_FOUND`
- `APPOINTMENT_SLOT_UNAVAILABLE`
- `APPOINTMENT_SLOT_UPDATE_FAILED`
- `APPOINTMENT_CREATE_FAILED`
- `APPOINTMENT_UPDATE_FAILED`
- `APPOINTMENTS_MUTATION_FAILED`

## `GET /api/encounters`
Lists encounters by role.

- Auth: required
- Role behavior:
  - `provider`: encounters for provider
  - `patient`: encounters for own patient profile
  - others: denied

### Encounter object
```json
{
  "id": "uuid",
  "appointmentId": "uuid",
  "patientId": "uuid",
  "providerId": "uuid",
  "status": "active",
  "startedAt": "2026-03-15T10:00:00+00:00",
  "patientJoinedAt": null,
  "createdAt": "2026-03-15T10:00:00+00:00",
  "updatedAt": "2026-03-15T10:00:00+00:00"
}
```

### Error codes
- `AUTH_REQUIRED`
- `ORG_CONTEXT_REQUIRED`
- `ENCOUNTERS_ACCESS_DENIED`
- `ENCOUNTERS_READ_FAILED`

## `POST /api/encounters`
Encounter lifecycle mutation endpoint.

## `PATCH /api/encounters`
Same mutation behavior as `POST`.

### Request body variants
```json
{ "action": "start", "appointmentId": "uuid" }
```
```json
{ "action": "join", "encounterId": "uuid" }
```
```json
{ "action": "complete", "encounterId": "uuid" }
```

### Error codes
- `AUTH_REQUIRED`
- `VALIDATION_ERROR`
- `ORG_CONTEXT_REQUIRED`
- `ENCOUNTER_START_FORBIDDEN`
- `ENCOUNTER_JOIN_FORBIDDEN`
- `ENCOUNTER_COMPLETE_FORBIDDEN`
- `PATIENT_PROFILE_REQUIRED`
- `APPOINTMENT_NOT_FOUND`
- `ENCOUNTER_NOT_FOUND`
- `ENCOUNTER_START_INVALID_STATUS`
- `ENCOUNTER_CLOSED`
- `ENCOUNTER_CREATE_FAILED`
- `ENCOUNTER_UPDATE_FAILED`
- `ENCOUNTERS_MUTATION_FAILED`

## `GET /api/encounters/session?encounterId=<uuid>`
Returns join URL for a provider/patient authorized encounter.

- Auth: required
- Role behavior:
  - provider: must own encounter (`provider_id`)
  - patient: must own encounter via own patient profile
- Allowed encounter statuses: `active`, `connected`

### Success `200`
```json
{
  "data": {
    "encounterId": "uuid",
    "status": "active",
    "joinUrl": "http://localhost:3000/encounters/<id>/video"
  },
  "meta": {
    "requestId": "..."
  }
}
```

### Error codes
- `AUTH_REQUIRED`
- `VALIDATION_ERROR`
- `ENCOUNTER_NOT_FOUND`
- `ENCOUNTER_ACCESS_DENIED`
- `ENCOUNTER_SESSION_UNAVAILABLE`
- `ENCOUNTER_SESSION_FAILED`

## `GET /api/medical-records`
Returns clinical note summaries.

- Auth: required
- Role behavior:
  - `patient`: own summaries only
  - `provider`: provider summaries
  - others: denied
- Optional query: `patientId`
  - For `patient` role, passing another patientId returns `MEDICAL_RECORDS_ACCESS_DENIED`

### Summary object
```json
{
  "id": "uuid",
  "encounterId": "uuid",
  "patientId": "uuid",
  "providerId": "uuid",
  "noteType": "soap",
  "summary": "Text summary...",
  "version": 1,
  "createdAt": "2026-03-15T10:00:00+00:00",
  "updatedAt": "2026-03-15T10:00:00+00:00"
}
```

### Error codes
- `AUTH_REQUIRED`
- `ORG_CONTEXT_REQUIRED`
- `MEDICAL_RECORDS_ACCESS_DENIED`
- `MEDICAL_RECORDS_READ_FAILED`

## `POST /api/medical-records`
Creates/updates clinical notes.

## `PATCH /api/medical-records`
Same mutation behavior as `POST`.

- Auth: required
- Role: `provider` or `admin`

### Request body variants
```json
{
  "action": "create",
  "encounterId": "uuid",
  "noteType": "soap",
  "content": "Clinical note text"
}
```
```json
{
  "action": "update",
  "noteId": "uuid",
  "noteType": "progress",
  "content": "Updated note"
}
```

### Success `200`
Returns clinical note record:
```json
{
  "id": "uuid",
  "encounterId": "uuid",
  "patientId": "uuid",
  "providerId": "uuid",
  "noteType": "soap",
  "content": "Clinical note text",
  "version": 1,
  "createdAt": "2026-03-15T10:00:00+00:00",
  "updatedAt": "2026-03-15T10:00:00+00:00"
}
```

### Error codes
- `AUTH_REQUIRED`
- `MEDICAL_RECORDS_MUTATION_FORBIDDEN`
- `VALIDATION_ERROR`
- `ORG_CONTEXT_REQUIRED`
- `ENCOUNTER_NOT_FOUND`
- `CLINICAL_NOTE_ALREADY_EXISTS`
- `CLINICAL_NOTE_NOT_FOUND`
- `CLINICAL_NOTE_CREATE_FAILED`
- `CLINICAL_NOTE_UPDATE_FAILED`
- `MEDICAL_RECORDS_MUTATION_FAILED`

## `POST /api/organizations/onboarding`
Creates an organization and owner membership.

- Auth: required
- Role behavior:
  - Platform `admin`: allowed
  - Non-admin: must already be org `owner` or `admin`

### Request body
```json
{
  "name": "Bacancy Health Network",
  "slug": "bacancy-health-network"
}
```

### Success `200`
```json
{
  "data": {
    "organizationId": "uuid",
    "slug": "bacancy-health-network",
    "nextPath": "/dashboard"
  },
  "message": "Organization onboarding completed.",
  "requestId": "..."
}
```

### Error codes
- `AUTH_REQUIRED`
- `VALIDATION_ERROR`
- `ORG_CREATE_FORBIDDEN`
- `ORG_ONBOARDING_MEMBERSHIP_LOOKUP_FAILED`
- `ORG_ONBOARDING_LOOKUP_FAILED`
- `ORG_SLUG_TAKEN`
- `ORG_CREATE_FAILED`
- `ORG_MEMBERSHIP_CREATE_FAILED`
- `ORG_ONBOARDING_FAILED`

## `POST /api/prescriptions`
Uploads a prescription file.

- Auth: required
- Role: `patient` or platform `admin`
- Content-Type: `multipart/form-data`
- Form fields:
  - `file` (required, PDF/JPEG/PNG, max 5 MB)
  - `patientId` (required only when role is `admin`)

### Success `200`
```json
{
  "data": {
    "id": "uuid",
    "organizationId": "uuid",
    "patientId": "uuid",
    "uploadedBy": "uuid",
    "fileName": "prescription.pdf",
    "filePath": "<patient-user-id>/<timestamp>-<uuid>-prescription.pdf",
    "mimeType": "application/pdf",
    "sizeBytes": 12345,
    "createdAt": "2026-03-15T10:00:00+00:00"
  },
  "message": "Prescription uploaded.",
  "requestId": "..."
}
```

### Error codes
- `AUTH_REQUIRED`
- `PRESCRIPTION_UPLOAD_FORBIDDEN`
- `PRESCRIPTION_FILE_REQUIRED`
- `PRESCRIPTION_FILE_TYPE_INVALID`
- `PRESCRIPTION_FILE_SIZE_INVALID`
- `PATIENT_ID_REQUIRED`
- `PATIENT_PROFILE_REQUIRED`
- `PRESCRIPTION_UPLOAD_FAILED`
- `PRESCRIPTION_METADATA_SAVE_FAILED`

## Notes
- UUID fields are validated strictly.
- Validation failures consistently return `400 VALIDATION_ERROR`.
- Appointment, encounter, and medical-record APIs are tenant-aware and depend on organization membership context.
