import { describe, expect, it } from "vitest";
import {
  handleMedicalRecordsGet,
  handleMedicalRecordsMutation,
} from "@/app/api/medical-records/handlers";

type Repo = Parameters<typeof handleMedicalRecordsGet>[0];

function createRepo(overrides?: Partial<Repo>): Repo {
  return {
    getAuthUser: async () => null,
    getCurrentOrganizationId: async () => "1f7af307-8ffc-4cf1-b390-a6daa34f4cb0",
    getOrganizationIdForEncounter: async () => null,
    getOrganizationIdForNote: async () => null,
    logAuditEvent: async () => undefined,
    getPatientIdByUserId: async () => null,
    getEncounterById: async () => null,
    getNoteById: async () => null,
    getNoteByEncounterId: async () => null,
    createNote: async () => ({
      id: "f8d09cc8-d95c-41c3-95ca-95bc7bf228a9",
      encounterId: "6ef76adf-49e5-4d6d-99cc-c1d2a7f9988f",
      patientId: "7f961b6b-b271-4c7c-86f9-29f0f4572f4d",
      providerId: "4f28c9cc-8de6-4e24-bf75-b4502bb99825",
      noteType: "soap",
      content: "Assessment: improving with treatment.",
      version: 1,
      createdAt: "2026-03-20T10:00:00.000Z",
      updatedAt: "2026-03-20T10:00:00.000Z",
    }),
    updateNote: async () => ({
      id: "f8d09cc8-d95c-41c3-95ca-95bc7bf228a9",
      encounterId: "6ef76adf-49e5-4d6d-99cc-c1d2a7f9988f",
      patientId: "7f961b6b-b271-4c7c-86f9-29f0f4572f4d",
      providerId: "4f28c9cc-8de6-4e24-bf75-b4502bb99825",
      noteType: "progress",
      content: "Plan updated with tapering schedule.",
      version: 2,
      createdAt: "2026-03-20T10:00:00.000Z",
      updatedAt: "2026-03-20T10:05:00.000Z",
    }),
    listForPatient: async () => [],
    listForProvider: async () => [],
    ...overrides,
  };
}

describe("medical records route", () => {
  it("creates clinical note for provider with encounter ownership", async () => {
    const auditEvents: Array<{ eventType: string; action: string }> = [];
    const response = await handleMedicalRecordsMutation(
      createRepo({
        logAuditEvent: async (event) => {
          auditEvents.push({ eventType: event.eventType, action: event.action });
        },
        getAuthUser: async () => ({
          id: "4f28c9cc-8de6-4e24-bf75-b4502bb99825",
          user_metadata: { role: "provider" },
        }),
        getEncounterById: async () => ({
          id: "6ef76adf-49e5-4d6d-99cc-c1d2a7f9988f",
          patientId: "7f961b6b-b271-4c7c-86f9-29f0f4572f4d",
          providerId: "4f28c9cc-8de6-4e24-bf75-b4502bb99825",
        }),
      }),
      "req-note-create",
      {
        action: "create",
        encounterId: "6ef76adf-49e5-4d6d-99cc-c1d2a7f9988f",
        noteType: "soap",
        content: "Subjective: mild headache. Assessment: stable.",
      },
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toBe("Clinical note saved.");
    expect(body.data.version).toBe(1);
    expect(auditEvents).toEqual([
      { eventType: "medical_records.created", action: "create" },
    ]);
  });

  it("allows admin to create a clinical note for a patient encounter", async () => {
    const response = await handleMedicalRecordsMutation(
      createRepo({
        getAuthUser: async () => ({
          id: "8a6eb602-1084-49d4-a2de-d76dbba15cff",
          user_metadata: { role: "admin" },
        }),
        getEncounterById: async () => ({
          id: "6ef76adf-49e5-4d6d-99cc-c1d2a7f9988f",
          patientId: "7f961b6b-b271-4c7c-86f9-29f0f4572f4d",
          providerId: "4f28c9cc-8de6-4e24-bf75-b4502bb99825",
        }),
      }),
      "req-note-create-admin",
      {
        action: "create",
        encounterId: "6ef76adf-49e5-4d6d-99cc-c1d2a7f9988f",
        noteType: "progress",
        content: "Admin-entered note for care coordination.",
      },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toBe("Clinical note saved.");
  });

  it("allows super admin mutation using encounter org fallback without membership", async () => {
    const response = await handleMedicalRecordsMutation(
      createRepo({
        getAuthUser: async () => ({
          id: "8a6eb602-1084-49d4-a2de-d76dbba15cff",
          user_metadata: { role: "admin" },
        }),
        getCurrentOrganizationId: async () => null,
        getOrganizationIdForEncounter: async () =>
          "1f7af307-8ffc-4cf1-b390-a6daa34f4cb0",
        getEncounterById: async () => ({
          id: "6ef76adf-49e5-4d6d-99cc-c1d2a7f9988f",
          patientId: "7f961b6b-b271-4c7c-86f9-29f0f4572f4d",
          providerId: "4f28c9cc-8de6-4e24-bf75-b4502bb99825",
        }),
      }),
      "req-note-create-admin-fallback",
      {
        action: "create",
        encounterId: "6ef76adf-49e5-4d6d-99cc-c1d2a7f9988f",
        noteType: "soap",
        content: "Admin-entered note without membership context.",
      },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toBe("Clinical note saved.");
  });

  it("updates existing note and bumps version", async () => {
    const response = await handleMedicalRecordsMutation(
      createRepo({
        getAuthUser: async () => ({
          id: "4f28c9cc-8de6-4e24-bf75-b4502bb99825",
          user_metadata: { role: "provider" },
        }),
        getNoteById: async () => ({
          id: "f8d09cc8-d95c-41c3-95ca-95bc7bf228a9",
          encounterId: "6ef76adf-49e5-4d6d-99cc-c1d2a7f9988f",
          patientId: "7f961b6b-b271-4c7c-86f9-29f0f4572f4d",
          providerId: "4f28c9cc-8de6-4e24-bf75-b4502bb99825",
          noteType: "soap",
          content: "Assessment: stable.",
          version: 1,
          createdAt: "2026-03-20T10:00:00.000Z",
          updatedAt: "2026-03-20T10:00:00.000Z",
        }),
      }),
      "req-note-update",
      {
        action: "update",
        noteId: "f8d09cc8-d95c-41c3-95ca-95bc7bf228a9",
        noteType: "progress",
        content: "Assessment: improving. Plan adjusted.",
      },
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toBe("Clinical note updated.");
    expect(body.data.version).toBe(2);
  });

  it("returns patient summaries on GET", async () => {
    const response = await handleMedicalRecordsGet(
      createRepo({
        getAuthUser: async () => ({
          id: "38f8ea40-4e43-429f-bf45-4c7f3e0dfc8c",
          user_metadata: { role: "patient" },
        }),
        getPatientIdByUserId: async () =>
          "7f961b6b-b271-4c7c-86f9-29f0f4572f4d",
        listForPatient: async () => [
          {
            id: "f8d09cc8-d95c-41c3-95ca-95bc7bf228a9",
            encounterId: "6ef76adf-49e5-4d6d-99cc-c1d2a7f9988f",
            patientId: "7f961b6b-b271-4c7c-86f9-29f0f4572f4d",
            providerId: "4f28c9cc-8de6-4e24-bf75-b4502bb99825",
            noteType: "soap",
            content: "Subjective: doing better and sleeping well.",
            version: 1,
            createdAt: "2026-03-20T10:00:00.000Z",
            updatedAt: "2026-03-20T10:00:00.000Z",
          },
        ],
      }),
      "req-record-list",
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].summary).toContain("Subjective");
  });

  it("denies patient attempts to request another patient's records", async () => {
    const response = await handleMedicalRecordsGet(
      createRepo({
        getAuthUser: async () => ({
          id: "38f8ea40-4e43-429f-bf45-4c7f3e0dfc8c",
          user_metadata: { role: "patient" },
        }),
        getPatientIdByUserId: async () =>
          "7f961b6b-b271-4c7c-86f9-29f0f4572f4d",
      }),
      "req-records-denied",
      {
        requestedPatientId: "0d5b72ac-bf6e-4969-92c9-26d2d8a8ef85",
      },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("MEDICAL_RECORDS_ACCESS_DENIED");
  });

  it("denies patient note mutations", async () => {
    const response = await handleMedicalRecordsMutation(
      createRepo({
        getAuthUser: async () => ({
          id: "38f8ea40-4e43-429f-bf45-4c7f3e0dfc8c",
          user_metadata: { role: "patient" },
        }),
      }),
      "req-note-deny",
      {
        action: "create",
        encounterId: "6ef76adf-49e5-4d6d-99cc-c1d2a7f9988f",
        noteType: "soap",
        content: "Blocked attempt",
      },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("MEDICAL_RECORDS_MUTATION_FORBIDDEN");
  });
});
