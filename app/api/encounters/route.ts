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
import { createClient } from "@/lib/supabase/server";
import {
  encounterMutationSchema,
  encounterRecordSchema,
  type EncounterMutationInput,
  type EncounterRecord,
} from "@/lib/validations/encounter.schema";

type AuthUser = {
  id: string;
  user_metadata?: { role?: string };
};

type AppointmentRecord = {
  id: string;
  patientId: string;
  providerId: string;
  status: "confirmed" | "cancelled";
};

type EncountersRepository = {
  getAuthUser: () => Promise<AuthUser | null>;
  getPatientIdByUserId: (userId: string) => Promise<string | null>;
  getAppointmentById: (appointmentId: string) => Promise<AppointmentRecord | null>;
  getEncounterById: (encounterId: string) => Promise<EncounterRecord | null>;
  getEncounterByAppointmentId: (
    appointmentId: string,
  ) => Promise<EncounterRecord | null>;
  createEncounter: (input: {
    appointmentId: string;
    patientId: string;
    providerId: string;
    status: "active" | "connected" | "completed";
    startedAt: string | null;
    patientJoinedAt: string | null;
  }) => Promise<EncounterRecord>;
  updateEncounter: (
    encounterId: string,
    input: Partial<{
      status: "active" | "connected" | "completed";
      startedAt: string | null;
      patientJoinedAt: string | null;
    }>,
  ) => Promise<EncounterRecord>;
  listForPatient: (patientId: string) => Promise<EncounterRecord[]>;
  listForProvider: (providerId: string) => Promise<EncounterRecord[]>;
};

export async function GET(request: Request) {
  const requestId = getRequestId(request);

  try {
    const supabase = await createClient();
    const repo = createSupabaseEncountersRepository(supabase);
    return await handleEncountersGet(repo, requestId);
  } catch {
    return createErrorResponse(
      new ApiError({
        code: "ENCOUNTERS_READ_FAILED",
        message: "Unable to load encounters.",
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

async function handleEncountersGet(
  repo: EncountersRepository,
  requestId: string,
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

  if (role === "provider") {
    const encounters = await repo.listForProvider(user.id);
    return createReadResponse(encounters, requestId);
  }

  if (role === "patient") {
    const patientId = await repo.getPatientIdByUserId(user.id);
    if (!patientId) {
      return createReadResponse([], requestId);
    }

    const encounters = await repo.listForPatient(patientId);
    return createReadResponse(encounters, requestId);
  }

  return createErrorResponse(
    new ApiError({
      code: "ENCOUNTERS_ACCESS_DENIED",
      message: "Role does not have encounter access.",
      status: 403,
    }),
    requestId,
  );
}

async function handleEncountersMutation(
  repo: EncountersRepository,
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

  const parsedPayload = encounterMutationSchema.safeParse(payload);

  if (!parsedPayload.success) {
    return createErrorResponse(
      createValidationError(parsedPayload.error),
      requestId,
    );
  }

  switch (parsedPayload.data.action) {
    case "start":
      return handleStartEncounter(repo, requestId, user, parsedPayload.data);
    case "join":
      return handleJoinEncounter(repo, requestId, user, parsedPayload.data);
    case "complete":
      return handleCompleteEncounter(repo, requestId, user, parsedPayload.data);
  }
}

async function handleStartEncounter(
  repo: EncountersRepository,
  requestId: string,
  user: AuthUser,
  payload: Extract<EncounterMutationInput, { action: "start" }>,
) {
  if (getUserRole(user) !== "provider") {
    return createErrorResponse(
      new ApiError({
        code: "ENCOUNTER_START_FORBIDDEN",
        message: "Only providers can start encounters.",
        status: 403,
      }),
      requestId,
    );
  }

  const appointment = await repo.getAppointmentById(payload.appointmentId);

  if (!appointment || appointment.providerId !== user.id) {
    return createErrorResponse(
      new ApiError({
        code: "APPOINTMENT_NOT_FOUND",
        message: "Appointment not found.",
        status: 404,
      }),
      requestId,
    );
  }

  if (appointment.status !== "confirmed") {
    return createErrorResponse(
      new ApiError({
        code: "ENCOUNTER_START_INVALID_STATUS",
        message: "Encounter can only start from a confirmed appointment.",
        status: 409,
      }),
      requestId,
    );
  }

  const existing = await repo.getEncounterByAppointmentId(appointment.id);

  if (existing && existing.status !== "completed") {
    return createMutationResponse(existing, requestId, "Encounter already active.");
  }

  const nowIso = new Date().toISOString();
  const encounter = await repo.createEncounter({
    appointmentId: appointment.id,
    patientId: appointment.patientId,
    providerId: appointment.providerId,
    status: "active",
    startedAt: nowIso,
    patientJoinedAt: null,
  });

  return createMutationResponse(encounter, requestId, "Encounter started.");
}

async function handleJoinEncounter(
  repo: EncountersRepository,
  requestId: string,
  user: AuthUser,
  payload: Extract<EncounterMutationInput, { action: "join" }>,
) {
  if (getUserRole(user) !== "patient") {
    return createErrorResponse(
      new ApiError({
        code: "ENCOUNTER_JOIN_FORBIDDEN",
        message: "Only patients can join encounters.",
        status: 403,
      }),
      requestId,
    );
  }

  const patientId = await repo.getPatientIdByUserId(user.id);
  if (!patientId) {
    return createErrorResponse(
      new ApiError({
        code: "PATIENT_PROFILE_REQUIRED",
        message: "Complete patient profile before joining encounters.",
        status: 400,
      }),
      requestId,
    );
  }

  const encounter = await repo.getEncounterById(payload.encounterId);

  if (!encounter || encounter.patientId !== patientId) {
    return createErrorResponse(
      new ApiError({
        code: "ENCOUNTER_NOT_FOUND",
        message: "Encounter not found.",
        status: 404,
      }),
      requestId,
    );
  }

  if (encounter.status === "completed") {
    return createErrorResponse(
      new ApiError({
        code: "ENCOUNTER_CLOSED",
        message: "Encounter has already been completed.",
        status: 409,
      }),
      requestId,
    );
  }

  const joined = await repo.updateEncounter(encounter.id, {
    status: "connected",
    patientJoinedAt: new Date().toISOString(),
  });

  return createMutationResponse(joined, requestId, "Encounter joined.");
}

async function handleCompleteEncounter(
  repo: EncountersRepository,
  requestId: string,
  user: AuthUser,
  payload: Extract<EncounterMutationInput, { action: "complete" }>,
) {
  if (getUserRole(user) !== "provider") {
    return createErrorResponse(
      new ApiError({
        code: "ENCOUNTER_COMPLETE_FORBIDDEN",
        message: "Only providers can complete encounters.",
        status: 403,
      }),
      requestId,
    );
  }

  const encounter = await repo.getEncounterById(payload.encounterId);

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

  const completed = await repo.updateEncounter(encounter.id, {
    status: "completed",
  });

  return createMutationResponse(completed, requestId, "Encounter completed.");
}

async function handleMutationRequest(request: Request) {
  const requestId = getRequestId(request);

  try {
    const payload = await parseJsonBody(request);
    const supabase = await createClient();
    const repo = createSupabaseEncountersRepository(supabase);
    return await handleEncountersMutation(repo, requestId, payload);
  } catch (error) {
    const apiError =
      error instanceof ApiError
        ? error
        : new ApiError({
            code: "ENCOUNTERS_MUTATION_FAILED",
            message: "Unable to update encounter.",
            status: 500,
          });

    return createErrorResponse(apiError, requestId);
  }
}

function createSupabaseEncountersRepository(
  supabase: Awaited<ReturnType<typeof createClient>>,
): EncountersRepository {
  return {
    async getAuthUser() {
      const { data, error } = await supabase.auth.getUser();
      if (error) return null;
      return data.user;
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
    async getAppointmentById(appointmentId) {
      const { data, error } = await supabase
        .from("appointments")
        .select("id,patient_id,provider_id,status")
        .eq("id", appointmentId)
        .maybeSingle();
      if (error || !data) return null;
      return {
        id: data.id,
        patientId: data.patient_id,
        providerId: data.provider_id,
        status: data.status,
      };
    },
    async getEncounterById(encounterId) {
      const { data, error } = await supabase
        .from("encounters")
        .select(
          "id,appointment_id,patient_id,provider_id,status,started_at,patient_joined_at,created_at,updated_at",
        )
        .eq("id", encounterId)
        .maybeSingle();
      if (error || !data) return null;
      return mapEncounter(data);
    },
    async getEncounterByAppointmentId(appointmentId) {
      const { data, error } = await supabase
        .from("encounters")
        .select(
          "id,appointment_id,patient_id,provider_id,status,started_at,patient_joined_at,created_at,updated_at",
        )
        .eq("appointment_id", appointmentId)
        .maybeSingle();
      if (error || !data) return null;
      return mapEncounter(data);
    },
    async createEncounter(input) {
      const { data, error } = await supabase
        .from("encounters")
        .insert({
          appointment_id: input.appointmentId,
          patient_id: input.patientId,
          provider_id: input.providerId,
          status: input.status,
          started_at: input.startedAt,
          patient_joined_at: input.patientJoinedAt,
        })
        .select(
          "id,appointment_id,patient_id,provider_id,status,started_at,patient_joined_at,created_at,updated_at",
        )
        .single();
      if (error || !data) {
        throw new ApiError({
          code: "ENCOUNTER_CREATE_FAILED",
          message: "Unable to create encounter.",
          status: 500,
        });
      }
      return mapEncounter(data);
    },
    async updateEncounter(encounterId, input) {
      const mapped = {
        status: input.status,
        started_at: input.startedAt,
        patient_joined_at: input.patientJoinedAt,
      };
      const { data, error } = await supabase
        .from("encounters")
        .update(mapped)
        .eq("id", encounterId)
        .select(
          "id,appointment_id,patient_id,provider_id,status,started_at,patient_joined_at,created_at,updated_at",
        )
        .single();
      if (error || !data) {
        throw new ApiError({
          code: "ENCOUNTER_UPDATE_FAILED",
          message: "Unable to update encounter.",
          status: 500,
        });
      }
      return mapEncounter(data);
    },
    async listForPatient(patientId) {
      const { data, error } = await supabase
        .from("encounters")
        .select(
          "id,appointment_id,patient_id,provider_id,status,started_at,patient_joined_at,created_at,updated_at",
        )
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });
      if (error || !data) return [];
      return data.map(mapEncounter);
    },
    async listForProvider(providerId) {
      const { data, error } = await supabase
        .from("encounters")
        .select(
          "id,appointment_id,patient_id,provider_id,status,started_at,patient_joined_at,created_at,updated_at",
        )
        .eq("provider_id", providerId)
        .order("created_at", { ascending: false });
      if (error || !data) return [];
      return data.map(mapEncounter);
    },
  };
}

function mapEncounter(row: {
  id: string;
  appointment_id: string;
  patient_id: string;
  provider_id: string;
  status: string;
  started_at: string | null;
  patient_joined_at: string | null;
  created_at: string;
  updated_at: string;
}): EncounterRecord {
  return encounterRecordSchema.parse({
    id: row.id,
    appointmentId: row.appointment_id,
    patientId: row.patient_id,
    providerId: row.provider_id,
    status: row.status,
    startedAt: row.started_at,
    patientJoinedAt: row.patient_joined_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw createJsonBodyError();
  }
}
