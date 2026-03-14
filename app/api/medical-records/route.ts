import {
  ApiError,
  createJsonBodyError,
  createValidationError,
} from "@/lib/api/errors";
import {
  createErrorResponse,
  createMutationResponse,
  createReadResponse,
} from "@/lib/api/response";
import { getRequestId } from "@/lib/api/request-id";
import { getUserRole } from "@/lib/auth/roles";
import { getPrimaryOrganizationIdForUser } from "@/lib/auth/tenant";
import { insertAuditEvent } from "@/lib/audit/log";
import { createClient } from "@/lib/supabase/server";
import {
  medicalRecordMutationSchema,
  medicalRecordRecordSchema,
  medicalRecordSummarySchema,
  type MedicalRecordMutationInput,
  type MedicalRecordRecord,
  type MedicalRecordSummary,
} from "@/lib/validations/medical-record.schema";

type AuthUser = {
  id: string;
  user_metadata?: { role?: string };
};

type EncounterRecord = {
  id: string;
  patientId: string;
  providerId: string;
};

type MedicalRecordsRepository = {
  getAuthUser: () => Promise<AuthUser | null>;
  getCurrentOrganizationId?: (userId: string) => Promise<string | null>;
  logAuditEvent: (event: {
    eventType: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    actorId?: string;
    actorRole: string;
    requestId: string;
    organizationId: string;
    metadata?: Record<string, unknown>;
  }) => Promise<void>;
  getPatientIdByUserId: (userId: string) => Promise<string | null>;
  getEncounterById: (
    encounterId: string,
    organizationId: string,
  ) => Promise<EncounterRecord | null>;
  getNoteById: (
    noteId: string,
    organizationId: string,
  ) => Promise<MedicalRecordRecord | null>;
  getNoteByEncounterId: (
    encounterId: string,
    organizationId: string,
  ) => Promise<MedicalRecordRecord | null>;
  createNote: (input: {
    organizationId: string;
    encounterId: string;
    patientId: string;
    providerId: string;
    noteType: "soap" | "progress";
    content: string;
  }) => Promise<MedicalRecordRecord>;
  updateNote: (input: {
    noteId: string;
    organizationId: string;
    noteType: "soap" | "progress";
    content: string;
    version: number;
  }) => Promise<MedicalRecordRecord>;
  listForPatient: (
    patientId: string,
    organizationId: string,
  ) => Promise<MedicalRecordRecord[]>;
  listForProvider: (
    providerId: string,
    organizationId: string,
  ) => Promise<MedicalRecordRecord[]>;
};

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  const requestedPatientId = new URL(request.url).searchParams.get("patientId");

  try {
    const supabase = await createClient();
    const repo = createSupabaseMedicalRecordsRepository(supabase);
    return await handleMedicalRecordsGet(repo, requestId, {
      requestedPatientId,
    });
  } catch {
    return createErrorResponse(
      new ApiError({
        code: "MEDICAL_RECORDS_READ_FAILED",
        message: "Unable to load medical records.",
        status: 500,
      }),
      requestId,
    );
  }
}

export async function POST(request: Request) {
  return handleMutationRequest(request);
}

export async function PATCH(request: Request) {
  return handleMutationRequest(request);
}

export async function handleMedicalRecordsGet(
  repo: MedicalRecordsRepository,
  requestId: string,
  options?: { requestedPatientId: string | null },
) {
  const user = await repo.getAuthUser();

  if (!user) {
    return createErrorResponse(
      new ApiError({
        code: "AUTH_REQUIRED",
        message: "Authentication required.",
        status: 401,
      }),
      requestId,
    );
  }

  const role = getUserRole(user);
  const organizationId = await resolveOrganizationId(repo, user.id);
  if (!organizationId) {
    return createErrorResponse(
      new ApiError({
        code: "ORG_CONTEXT_REQUIRED",
        message: "No organization context found for current user.",
        status: 403,
      }),
      requestId,
    );
  }

  if (role === "patient") {
    const patientId = await repo.getPatientIdByUserId(user.id);
    if (!patientId) {
      return createReadResponse([], requestId);
    }
    if (
      options?.requestedPatientId !== null &&
      options?.requestedPatientId !== undefined &&
      options.requestedPatientId !== patientId
    ) {
      return createErrorResponse(
        new ApiError({
          code: "MEDICAL_RECORDS_ACCESS_DENIED",
          message: "You are not authorized to view another patient's records.",
          status: 403,
        }),
        requestId,
      );
    }

    const notes = await repo.listForPatient(patientId, organizationId);
    return createReadResponse(mapSummaries(notes), requestId);
  }

  if (role === "provider") {
    const notes = await repo.listForProvider(user.id, organizationId);
    return createReadResponse(mapSummaries(notes), requestId);
  }

  return createErrorResponse(
    new ApiError({
      code: "MEDICAL_RECORDS_ACCESS_DENIED",
      message: "Role does not have medical record access.",
      status: 403,
    }),
    requestId,
  );
}

export async function handleMedicalRecordsMutation(
  repo: MedicalRecordsRepository,
  requestId: string,
  payload: unknown,
) {
  const user = await repo.getAuthUser();

  if (!user) {
    return createErrorResponse(
      new ApiError({
        code: "AUTH_REQUIRED",
        message: "Authentication required.",
        status: 401,
      }),
      requestId,
    );
  }

  if (getUserRole(user) !== "provider") {
    return createErrorResponse(
      new ApiError({
        code: "MEDICAL_RECORDS_MUTATION_FORBIDDEN",
        message: "Only providers can manage clinical notes.",
        status: 403,
      }),
      requestId,
    );
  }

  const parsedPayload = medicalRecordMutationSchema.safeParse(payload);

  if (!parsedPayload.success) {
    return createErrorResponse(
      createValidationError(parsedPayload.error),
      requestId,
    );
  }

  const organizationId = await resolveOrganizationId(repo, user.id);
  if (!organizationId) {
    return createErrorResponse(
      new ApiError({
        code: "ORG_CONTEXT_REQUIRED",
        message: "No organization context found for current user.",
        status: 403,
      }),
      requestId,
    );
  }

  switch (parsedPayload.data.action) {
    case "create":
      return handleCreateMedicalRecord(
        repo,
        requestId,
        organizationId,
        user,
        parsedPayload.data,
      );
    case "update":
      return handleUpdateMedicalRecord(
        repo,
        requestId,
        organizationId,
        user,
        parsedPayload.data,
      );
  }
}

async function handleCreateMedicalRecord(
  repo: MedicalRecordsRepository,
  requestId: string,
  organizationId: string,
  user: AuthUser,
  payload: Extract<MedicalRecordMutationInput, { action: "create" }>,
) {
  const encounter = await repo.getEncounterById(payload.encounterId, organizationId);

  if (!encounter || encounter.providerId !== user.id) {
    return createErrorResponse(
      new ApiError({
        code: "ENCOUNTER_NOT_FOUND",
        message: "Encounter not found.",
        status: 404,
      }),
      requestId,
    );
  }

  const existing = await repo.getNoteByEncounterId(encounter.id, organizationId);

  if (existing) {
    return createErrorResponse(
      new ApiError({
        code: "CLINICAL_NOTE_ALREADY_EXISTS",
        message: "Encounter already has a clinical note. Use update instead.",
        status: 409,
      }),
      requestId,
    );
  }

  const note = await repo.createNote({
    organizationId,
    encounterId: encounter.id,
    patientId: encounter.patientId,
    providerId: encounter.providerId,
    noteType: payload.noteType,
    content: payload.content,
  });
  await repo.logAuditEvent({
    eventType: "medical_records.created",
    action: "create",
    resourceType: "clinical_note",
    resourceId: note.id,
    actorId: user.id,
    actorRole: "provider",
    requestId,
    organizationId,
    metadata: { encounterId: note.encounterId, patientId: note.patientId },
  });

  return createMutationResponse(note, requestId, "Clinical note saved.");
}

async function handleUpdateMedicalRecord(
  repo: MedicalRecordsRepository,
  requestId: string,
  organizationId: string,
  user: AuthUser,
  payload: Extract<MedicalRecordMutationInput, { action: "update" }>,
) {
  const existing = await repo.getNoteById(payload.noteId, organizationId);

  if (!existing || existing.providerId !== user.id) {
    return createErrorResponse(
      new ApiError({
        code: "CLINICAL_NOTE_NOT_FOUND",
        message: "Clinical note not found.",
        status: 404,
      }),
      requestId,
    );
  }

  const updated = await repo.updateNote({
    noteId: existing.id,
    organizationId,
    noteType: payload.noteType,
    content: payload.content,
    version: existing.version + 1,
  });
  await repo.logAuditEvent({
    eventType: "medical_records.updated",
    action: "update",
    resourceType: "clinical_note",
    resourceId: updated.id,
    actorId: user.id,
    actorRole: "provider",
    requestId,
    organizationId,
    metadata: { encounterId: updated.encounterId, version: updated.version },
  });

  return createMutationResponse(updated, requestId, "Clinical note updated.");
}

async function handleMutationRequest(request: Request) {
  const requestId = getRequestId(request);

  try {
    const payload = await parseJsonBody(request);
    const supabase = await createClient();
    const repo = createSupabaseMedicalRecordsRepository(supabase);
    return await handleMedicalRecordsMutation(repo, requestId, payload);
  } catch (error) {
    const apiError =
      error instanceof ApiError
        ? error
        : new ApiError({
            code: "MEDICAL_RECORDS_MUTATION_FAILED",
            message: "Unable to update medical records.",
            status: 500,
          });

    return createErrorResponse(apiError, requestId);
  }
}

function createSupabaseMedicalRecordsRepository(
  supabase: Awaited<ReturnType<typeof createClient>>,
): MedicalRecordsRepository {
  return {
    async getAuthUser() {
      const { data, error } = await supabase.auth.getUser();
      if (error) return null;
      return data.user;
    },
    async getCurrentOrganizationId(userId) {
      return getPrimaryOrganizationIdForUser(supabase, userId);
    },
    async logAuditEvent(event) {
      await insertAuditEvent(supabase, event);
    },
    async getPatientIdByUserId(userId) {
      const { data, error } = await supabase
        .from("patients")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      if (error || !data) return null;
      return data.id;
    },
    async getEncounterById(encounterId, organizationId) {
      const { data, error } = await supabase
        .from("encounters")
        .select("id,patient_id,provider_id")
        .eq("id", encounterId)
        .eq("organization_id", organizationId)
        .maybeSingle();
      if (error || !data) return null;

      return {
        id: data.id,
        patientId: data.patient_id,
        providerId: data.provider_id,
      };
    },
    async getNoteById(noteId, organizationId) {
      const { data, error } = await supabase
        .from("clinical_notes")
        .select(
          "id,encounter_id,patient_id,provider_id,note_type,content,version,created_at,updated_at",
        )
        .eq("id", noteId)
        .eq("organization_id", organizationId)
        .maybeSingle();
      if (error || !data) return null;
      return mapMedicalRecord(data);
    },
    async getNoteByEncounterId(encounterId, organizationId) {
      const { data, error } = await supabase
        .from("clinical_notes")
        .select(
          "id,encounter_id,patient_id,provider_id,note_type,content,version,created_at,updated_at",
        )
        .eq("encounter_id", encounterId)
        .eq("organization_id", organizationId)
        .maybeSingle();
      if (error || !data) return null;
      return mapMedicalRecord(data);
    },
    async createNote(input) {
      const { data, error } = await supabase
        .from("clinical_notes")
        .insert({
          organization_id: input.organizationId,
          encounter_id: input.encounterId,
          patient_id: input.patientId,
          provider_id: input.providerId,
          note_type: input.noteType,
          content: input.content,
          version: 1,
        })
        .select(
          "id,encounter_id,patient_id,provider_id,note_type,content,version,created_at,updated_at",
        )
        .single();

      if (error || !data) {
        throw new ApiError({
          code: "CLINICAL_NOTE_CREATE_FAILED",
          message: "Unable to create clinical note.",
          status: 500,
        });
      }

      return mapMedicalRecord(data);
    },
    async updateNote(input) {
      const { data, error } = await supabase
        .from("clinical_notes")
        .update({
          note_type: input.noteType,
          content: input.content,
          version: input.version,
        })
        .eq("id", input.noteId)
        .eq("organization_id", input.organizationId)
        .select(
          "id,encounter_id,patient_id,provider_id,note_type,content,version,created_at,updated_at",
        )
        .single();

      if (error || !data) {
        throw new ApiError({
          code: "CLINICAL_NOTE_UPDATE_FAILED",
          message: "Unable to update clinical note.",
          status: 500,
        });
      }

      return mapMedicalRecord(data);
    },
    async listForPatient(patientId, organizationId) {
      const { data, error } = await supabase
        .from("clinical_notes")
        .select(
          "id,encounter_id,patient_id,provider_id,note_type,content,version,created_at,updated_at",
        )
        .eq("patient_id", patientId)
        .eq("organization_id", organizationId)
        .order("updated_at", { ascending: false });
      if (error || !data) return [];
      return data.map(mapMedicalRecord);
    },
    async listForProvider(providerId, organizationId) {
      const { data, error } = await supabase
        .from("clinical_notes")
        .select(
          "id,encounter_id,patient_id,provider_id,note_type,content,version,created_at,updated_at",
        )
        .eq("provider_id", providerId)
        .eq("organization_id", organizationId)
        .order("updated_at", { ascending: false });
      if (error || !data) return [];
      return data.map(mapMedicalRecord);
    },
  };
}

function mapMedicalRecord(row: {
  id: string;
  encounter_id: string;
  patient_id: string;
  provider_id: string;
  note_type: string;
  content: string;
  version: number;
  created_at: string;
  updated_at: string;
}): MedicalRecordRecord {
  return medicalRecordRecordSchema.parse({
    id: row.id,
    encounterId: row.encounter_id,
    patientId: row.patient_id,
    providerId: row.provider_id,
    noteType: row.note_type,
    content: row.content,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function mapSummaries(records: MedicalRecordRecord[]): MedicalRecordSummary[] {
  return records.map((record) =>
    medicalRecordSummarySchema.parse({
      id: record.id,
      encounterId: record.encounterId,
      patientId: record.patientId,
      providerId: record.providerId,
      noteType: record.noteType,
      summary: summarize(record.content),
      version: record.version,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }),
  );
}

async function resolveOrganizationId(
  repo: Pick<MedicalRecordsRepository, "getCurrentOrganizationId">,
  userId: string,
): Promise<string | null> {
  if (!repo.getCurrentOrganizationId) {
    return "legacy-org-context";
  }

  return repo.getCurrentOrganizationId(userId);
}

function summarize(content: string): string {
  const trimmed = content.trim();

  if (trimmed.length <= 180) {
    return trimmed;
  }

  return `${trimmed.slice(0, 177)}...`;
}

async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw createJsonBodyError();
  }
}
