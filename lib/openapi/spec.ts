const apiErrorSchema = {
  type: "object",
  properties: {
    code: { type: "string" },
    message: { type: "string" },
    details: {},
  },
  required: ["code", "message"],
};

const apiErrorResponseSchema = {
  type: "object",
  properties: {
    error: { $ref: "#/components/schemas/ApiError" },
    requestId: { type: "string" },
  },
  required: ["error", "requestId"],
};

const requestIdMetaSchema = {
  type: "object",
  properties: {
    requestId: { type: "string" },
  },
  required: ["requestId"],
};

const requestBodyContent = (schema: Record<string, unknown>) => ({
  required: true,
  content: {
    "application/json": {
      schema,
    },
  },
});

const errorResponses = {
  "400": {
    description: "Invalid payload or query",
    content: {
      "application/json": {
        schema: apiErrorResponseSchema,
      },
    },
  },
  "401": {
    description: "Authentication required",
    content: {
      "application/json": {
        schema: apiErrorResponseSchema,
      },
    },
  },
  "403": {
    description: "Forbidden",
    content: {
      "application/json": {
        schema: apiErrorResponseSchema,
      },
    },
  },
  "404": {
    description: "Not found",
    content: {
      "application/json": {
        schema: apiErrorResponseSchema,
      },
    },
  },
  "409": {
    description: "Conflict",
    content: {
      "application/json": {
        schema: apiErrorResponseSchema,
      },
    },
  },
  "500": {
    description: "Server error",
    content: {
      "application/json": {
        schema: apiErrorResponseSchema,
      },
    },
  },
};

export function getOpenApiSpec(origin: string) {
  return {
      openapi: "3.0.3",
      info: {
        title: "Health Stack API",
        version: "1.0.0",
        description:
          "Swagger/OpenAPI contract for Next.js App Router endpoints under /api.",
      },
      servers: [{ url: origin }],
      tags: [
        { name: "Auth" },
        { name: "Patients" },
        { name: "Providers" },
        { name: "Appointments" },
        { name: "Encounters" },
        { name: "Medical Records" },
        { name: "Organizations" },
        { name: "Prescriptions" },
      ],
      components: {
        schemas: {
          ApiError: apiErrorSchema,
          ApiErrorResponse: apiErrorResponseSchema,
          RequestMeta: requestIdMetaSchema,
          AuthSessionData: {
            type: "object",
            properties: {
              user: {
                type: ["object", "null"],
                properties: {
                  id: { type: "string", format: "uuid" },
                  email: { type: ["string", "null"], format: "email" },
                  emailConfirmedAt: {
                    type: ["string", "null"],
                    format: "date-time",
                  },
                  lastSignInAt: {
                    type: ["string", "null"],
                    format: "date-time",
                  },
                },
              },
              session: {
                type: "object",
                properties: {
                  isAuthenticated: { type: "boolean" },
                  needsEmailConfirmation: { type: "boolean" },
                },
                required: ["isAuthenticated", "needsEmailConfirmation"],
              },
              nextPath: { type: "string" },
            },
            required: ["user", "session"],
          },
          PatientRecord: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              userId: { type: "string", format: "uuid" },
              firstName: { type: "string" },
              lastName: { type: "string" },
              dateOfBirth: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
            },
            required: [
              "id",
              "userId",
              "firstName",
              "lastName",
              "dateOfBirth",
              "createdAt",
              "updatedAt",
            ],
          },
          AppointmentRecord: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              patientId: { type: "string", format: "uuid" },
              providerId: { type: "string", format: "uuid" },
              slotId: { type: "string", format: "uuid" },
              startsAt: { type: "string", format: "date-time" },
              endsAt: { type: "string", format: "date-time" },
              status: { type: "string", enum: ["confirmed", "cancelled"] },
            },
            required: [
              "id",
              "patientId",
              "providerId",
              "slotId",
              "startsAt",
              "endsAt",
              "status",
            ],
          },
          AvailabilitySlot: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              providerId: { type: "string", format: "uuid" },
              startsAt: { type: "string", format: "date-time" },
              endsAt: { type: "string", format: "date-time" },
              isAvailable: { type: "boolean", enum: [true] },
            },
            required: ["id", "providerId", "startsAt", "endsAt", "isAvailable"],
          },
          EncounterRecord: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              appointmentId: { type: "string", format: "uuid" },
              patientId: { type: "string", format: "uuid" },
              providerId: { type: "string", format: "uuid" },
              status: {
                type: "string",
                enum: ["active", "connected", "completed"],
              },
              startedAt: { type: ["string", "null"], format: "date-time" },
              patientJoinedAt: { type: ["string", "null"], format: "date-time" },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
            },
            required: [
              "id",
              "appointmentId",
              "patientId",
              "providerId",
              "status",
              "startedAt",
              "patientJoinedAt",
              "createdAt",
              "updatedAt",
            ],
          },
          MedicalRecordSummary: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              encounterId: { type: "string", format: "uuid" },
              patientId: { type: "string", format: "uuid" },
              providerId: { type: "string", format: "uuid" },
              noteType: { type: "string", enum: ["soap", "progress"] },
              summary: { type: "string" },
              version: { type: "integer" },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
            },
            required: [
              "id",
              "encounterId",
              "patientId",
              "providerId",
              "noteType",
              "summary",
              "version",
              "createdAt",
              "updatedAt",
            ],
          },
          ClinicalNoteRecord: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              encounterId: { type: "string", format: "uuid" },
              patientId: { type: "string", format: "uuid" },
              providerId: { type: "string", format: "uuid" },
              noteType: { type: "string", enum: ["soap", "progress"] },
              content: { type: "string" },
              version: { type: "integer" },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
            },
            required: [
              "id",
              "encounterId",
              "patientId",
              "providerId",
              "noteType",
              "content",
              "version",
              "createdAt",
              "updatedAt",
            ],
          },
          PrescriptionRecord: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              organizationId: { type: "string", format: "uuid" },
              patientId: { type: "string", format: "uuid" },
              uploadedBy: { type: "string", format: "uuid" },
              fileName: { type: "string" },
              filePath: { type: "string" },
              mimeType: { type: "string" },
              sizeBytes: { type: "integer" },
              createdAt: { type: "string", format: "date-time" },
            },
            required: [
              "id",
              "organizationId",
              "patientId",
              "uploadedBy",
              "fileName",
              "filePath",
              "mimeType",
              "sizeBytes",
              "createdAt",
            ],
          },
        },
      },
      paths: {
        "/api/auth": {
          get: {
            tags: ["Auth"],
            summary: "Get current auth session",
            responses: {
              "200": {
                description: "Current session",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        data: { $ref: "#/components/schemas/AuthSessionData" },
                        meta: { $ref: "#/components/schemas/RequestMeta" },
                      },
                      required: ["data", "meta"],
                    },
                  },
                },
              },
              ...errorResponses,
            },
          },
          post: {
            tags: ["Auth"],
            summary: "Auth mutation: sign-in, sign-up, or sign-out",
            requestBody: requestBodyContent({
              oneOf: [
                {
                  type: "object",
                  properties: {
                    action: { type: "string", enum: ["sign-in"] },
                    email: { type: "string", format: "email" },
                    password: { type: "string", minLength: 8 },
                  },
                  required: ["action", "email", "password"],
                },
                {
                  type: "object",
                  properties: {
                    action: { type: "string", enum: ["sign-up"] },
                    email: { type: "string", format: "email" },
                    password: { type: "string", minLength: 8 },
                  },
                  required: ["action", "email", "password"],
                },
                {
                  type: "object",
                  properties: {
                    action: { type: "string", enum: ["sign-out"] },
                  },
                  required: ["action"],
                },
              ],
            }),
            responses: {
              "200": {
                description: "Auth mutation result",
              },
              ...errorResponses,
            },
          },
        },
        "/api/patients": {
          get: {
            tags: ["Patients"],
            summary: "Get current user patient profile",
            responses: {
              "200": {
                description: "Patient profile or null",
              },
              ...errorResponses,
            },
          },
          post: {
            tags: ["Patients"],
            summary: "Create or update current user patient profile",
            requestBody: requestBodyContent({
              type: "object",
              properties: {
                firstName: { type: "string", minLength: 1, maxLength: 80 },
                lastName: { type: "string", minLength: 1, maxLength: 80 },
                dateOfBirth: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
              },
              required: ["firstName", "lastName", "dateOfBirth"],
            }),
            responses: {
              "200": {
                description: "Saved patient profile",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        data: { $ref: "#/components/schemas/PatientRecord" },
                        message: { type: "string" },
                        requestId: { type: "string" },
                      },
                      required: ["data", "message", "requestId"],
                    },
                  },
                },
              },
              ...errorResponses,
            },
          },
          patch: {
            tags: ["Patients"],
            summary: "Alias of POST for patient profile save",
            requestBody: requestBodyContent({
              type: "object",
              properties: {
                firstName: { type: "string", minLength: 1, maxLength: 80 },
                lastName: { type: "string", minLength: 1, maxLength: 80 },
                dateOfBirth: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
              },
              required: ["firstName", "lastName", "dateOfBirth"],
            }),
            responses: {
              "200": {
                description: "Saved patient profile",
              },
              ...errorResponses,
            },
          },
        },
        "/api/providers": {
          get: {
            tags: ["Providers"],
            summary: "Provider-only queue resource",
            responses: {
              "200": { description: "Provider queue payload" },
              ...errorResponses,
            },
          },
        },
        "/api/appointments/availability": {
          get: {
            tags: ["Appointments"],
            summary: "List available appointment slots",
            parameters: [
              {
                name: "date",
                in: "query",
                required: false,
                schema: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
                description: "Optional UTC date filter in YYYY-MM-DD format.",
              },
            ],
            responses: {
              "200": {
                description: "List of available slots",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        data: {
                          type: "array",
                          items: { $ref: "#/components/schemas/AvailabilitySlot" },
                        },
                        meta: {
                          type: "object",
                          properties: {
                            requestId: { type: "string" },
                            count: { type: "integer" },
                          },
                          required: ["requestId", "count"],
                        },
                      },
                      required: ["data", "meta"],
                    },
                  },
                },
              },
              ...errorResponses,
            },
          },
        },
        "/api/appointments": {
          get: {
            tags: ["Appointments"],
            summary: "List appointments by role (patient/provider)",
            responses: {
              "200": {
                description: "Appointment list",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        data: {
                          type: "array",
                          items: { $ref: "#/components/schemas/AppointmentRecord" },
                        },
                        meta: { $ref: "#/components/schemas/RequestMeta" },
                      },
                      required: ["data", "meta"],
                    },
                  },
                },
              },
              ...errorResponses,
            },
          },
          post: {
            tags: ["Appointments"],
            summary: "Patient appointment mutations: book/reschedule/cancel",
            requestBody: requestBodyContent({
              oneOf: [
                {
                  type: "object",
                  properties: {
                    action: { type: "string", enum: ["book"] },
                    slotId: { type: "string", format: "uuid" },
                  },
                  required: ["action", "slotId"],
                },
                {
                  type: "object",
                  properties: {
                    action: { type: "string", enum: ["reschedule"] },
                    appointmentId: { type: "string", format: "uuid" },
                    newSlotId: { type: "string", format: "uuid" },
                  },
                  required: ["action", "appointmentId", "newSlotId"],
                },
                {
                  type: "object",
                  properties: {
                    action: { type: "string", enum: ["cancel"] },
                    appointmentId: { type: "string", format: "uuid" },
                  },
                  required: ["action", "appointmentId"],
                },
              ],
            }),
            responses: {
              "200": {
                description: "Updated appointment",
              },
              ...errorResponses,
            },
          },
          patch: {
            tags: ["Appointments"],
            summary: "Alias of POST for appointment mutation",
            requestBody: requestBodyContent({
              oneOf: [
                {
                  type: "object",
                  properties: {
                    action: { type: "string", enum: ["book"] },
                    slotId: { type: "string", format: "uuid" },
                  },
                  required: ["action", "slotId"],
                },
                {
                  type: "object",
                  properties: {
                    action: { type: "string", enum: ["reschedule"] },
                    appointmentId: { type: "string", format: "uuid" },
                    newSlotId: { type: "string", format: "uuid" },
                  },
                  required: ["action", "appointmentId", "newSlotId"],
                },
                {
                  type: "object",
                  properties: {
                    action: { type: "string", enum: ["cancel"] },
                    appointmentId: { type: "string", format: "uuid" },
                  },
                  required: ["action", "appointmentId"],
                },
              ],
            }),
            responses: {
              "200": {
                description: "Updated appointment",
              },
              ...errorResponses,
            },
          },
        },
        "/api/encounters": {
          get: {
            tags: ["Encounters"],
            summary: "List encounters by role",
            responses: {
              "200": {
                description: "Encounter list",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        data: {
                          type: "array",
                          items: { $ref: "#/components/schemas/EncounterRecord" },
                        },
                        meta: { $ref: "#/components/schemas/RequestMeta" },
                      },
                      required: ["data", "meta"],
                    },
                  },
                },
              },
              ...errorResponses,
            },
          },
          post: {
            tags: ["Encounters"],
            summary: "Encounter lifecycle mutations: start/join/complete",
            requestBody: requestBodyContent({
              oneOf: [
                {
                  type: "object",
                  properties: {
                    action: { type: "string", enum: ["start"] },
                    appointmentId: { type: "string", format: "uuid" },
                  },
                  required: ["action", "appointmentId"],
                },
                {
                  type: "object",
                  properties: {
                    action: { type: "string", enum: ["join"] },
                    encounterId: { type: "string", format: "uuid" },
                  },
                  required: ["action", "encounterId"],
                },
                {
                  type: "object",
                  properties: {
                    action: { type: "string", enum: ["complete"] },
                    encounterId: { type: "string", format: "uuid" },
                  },
                  required: ["action", "encounterId"],
                },
              ],
            }),
            responses: {
              "200": {
                description: "Updated encounter",
              },
              ...errorResponses,
            },
          },
          patch: {
            tags: ["Encounters"],
            summary: "Alias of POST for encounter mutation",
            requestBody: requestBodyContent({
              oneOf: [
                {
                  type: "object",
                  properties: {
                    action: { type: "string", enum: ["start"] },
                    appointmentId: { type: "string", format: "uuid" },
                  },
                  required: ["action", "appointmentId"],
                },
                {
                  type: "object",
                  properties: {
                    action: { type: "string", enum: ["join"] },
                    encounterId: { type: "string", format: "uuid" },
                  },
                  required: ["action", "encounterId"],
                },
                {
                  type: "object",
                  properties: {
                    action: { type: "string", enum: ["complete"] },
                    encounterId: { type: "string", format: "uuid" },
                  },
                  required: ["action", "encounterId"],
                },
              ],
            }),
            responses: {
              "200": {
                description: "Updated encounter",
              },
              ...errorResponses,
            },
          },
        },
        "/api/encounters/session": {
          get: {
            tags: ["Encounters"],
            summary: "Get secure join URL for active/connected encounter",
            parameters: [
              {
                name: "encounterId",
                in: "query",
                required: true,
                schema: { type: "string", format: "uuid" },
              },
            ],
            responses: {
              "200": {
                description: "Encounter session payload",
              },
              ...errorResponses,
            },
          },
        },
        "/api/medical-records": {
          get: {
            tags: ["Medical Records"],
            summary: "List clinical note summaries",
            parameters: [
              {
                name: "patientId",
                in: "query",
                required: false,
                schema: { type: "string", format: "uuid" },
                description: "Optional patient filter (patient role must match own id).",
              },
            ],
            responses: {
              "200": {
                description: "Medical record summaries",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        data: {
                          type: "array",
                          items: {
                            $ref: "#/components/schemas/MedicalRecordSummary",
                          },
                        },
                        meta: { $ref: "#/components/schemas/RequestMeta" },
                      },
                      required: ["data", "meta"],
                    },
                  },
                },
              },
              ...errorResponses,
            },
          },
          post: {
            tags: ["Medical Records"],
            summary: "Create or update a clinical note",
            requestBody: requestBodyContent({
              oneOf: [
                {
                  type: "object",
                  properties: {
                    action: { type: "string", enum: ["create"] },
                    encounterId: { type: "string", format: "uuid" },
                    noteType: { type: "string", enum: ["soap", "progress"] },
                    content: { type: "string", minLength: 1, maxLength: 8000 },
                  },
                  required: ["action", "encounterId", "noteType", "content"],
                },
                {
                  type: "object",
                  properties: {
                    action: { type: "string", enum: ["update"] },
                    noteId: { type: "string", format: "uuid" },
                    noteType: { type: "string", enum: ["soap", "progress"] },
                    content: { type: "string", minLength: 1, maxLength: 8000 },
                  },
                  required: ["action", "noteId", "noteType", "content"],
                },
              ],
            }),
            responses: {
              "200": {
                description: "Clinical note result",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        data: { $ref: "#/components/schemas/ClinicalNoteRecord" },
                        message: { type: "string" },
                        requestId: { type: "string" },
                      },
                      required: ["data", "message", "requestId"],
                    },
                  },
                },
              },
              ...errorResponses,
            },
          },
          patch: {
            tags: ["Medical Records"],
            summary: "Alias of POST for clinical note mutation",
            requestBody: requestBodyContent({
              oneOf: [
                {
                  type: "object",
                  properties: {
                    action: { type: "string", enum: ["create"] },
                    encounterId: { type: "string", format: "uuid" },
                    noteType: { type: "string", enum: ["soap", "progress"] },
                    content: { type: "string", minLength: 1, maxLength: 8000 },
                  },
                  required: ["action", "encounterId", "noteType", "content"],
                },
                {
                  type: "object",
                  properties: {
                    action: { type: "string", enum: ["update"] },
                    noteId: { type: "string", format: "uuid" },
                    noteType: { type: "string", enum: ["soap", "progress"] },
                    content: { type: "string", minLength: 1, maxLength: 8000 },
                  },
                  required: ["action", "noteId", "noteType", "content"],
                },
              ],
            }),
            responses: {
              "200": {
                description: "Clinical note result",
              },
              ...errorResponses,
            },
          },
        },
        "/api/organizations/onboarding": {
          post: {
            tags: ["Organizations"],
            summary: "Create organization workspace and owner membership",
            requestBody: requestBodyContent({
              type: "object",
              properties: {
                name: { type: "string", minLength: 2, maxLength: 80 },
                slug: {
                  type: "string",
                  minLength: 3,
                  maxLength: 60,
                  pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
                },
              },
              required: ["name", "slug"],
            }),
            responses: {
              "200": { description: "Onboarding completion response" },
              ...errorResponses,
            },
          },
        },
        "/api/prescriptions": {
          post: {
            tags: ["Prescriptions"],
            summary: "Upload patient prescription file",
            requestBody: {
              required: true,
              content: {
                "multipart/form-data": {
                  schema: {
                    type: "object",
                    properties: {
                      file: { type: "string", format: "binary" },
                      patientId: {
                        type: "string",
                        format: "uuid",
                        description:
                          "Required for admin uploads, omitted for patient self-upload.",
                      },
                    },
                    required: ["file"],
                  },
                },
              },
            },
            responses: {
              "200": {
                description: "Uploaded prescription metadata",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        data: { $ref: "#/components/schemas/PrescriptionRecord" },
                        message: { type: "string" },
                        requestId: { type: "string" },
                      },
                      required: ["data", "message", "requestId"],
                    },
                  },
                },
              },
              ...errorResponses,
            },
          },
        },
      },
  };
}
