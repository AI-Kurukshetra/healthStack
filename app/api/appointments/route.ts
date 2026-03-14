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
  appointmentMutationSchema,
  appointmentRecordSchema,
  type AppointmentMutationInput,
  type AppointmentRecord,
} from "@/lib/validations/appointment.schema";

type AuthUser = {
  id: string;
  user_metadata?: { role?: string };
};

type SlotRecord = {
  id: string;
  providerId: string;
  startsAt: string;
  endsAt: string;
  isAvailable: boolean;
};

type AppointmentsRepository = {
  getAuthUser: () => Promise<AuthUser | null>;
  getPatientIdByUserId: (userId: string) => Promise<string | null>;
  getSlotById: (slotId: string) => Promise<SlotRecord | null>;
  setSlotAvailability: (slotId: string, isAvailable: boolean) => Promise<void>;
  createAppointment: (input: {
    patientId: string;
    providerId: string;
    slotId: string;
    startsAt: string;
    endsAt: string;
  }) => Promise<AppointmentRecord>;
  getAppointmentById: (appointmentId: string) => Promise<AppointmentRecord | null>;
  updateAppointment: (
    appointmentId: string,
    input: Partial<{
      providerId: string;
      slotId: string;
      startsAt: string;
      endsAt: string;
      status: "confirmed" | "cancelled";
    }>,
  ) => Promise<AppointmentRecord>;
  listAppointmentsForPatient: (patientId: string) => Promise<AppointmentRecord[]>;
  listAppointmentsForProvider: (providerId: string) => Promise<AppointmentRecord[]>;
};

export async function GET(request: Request) {
  const requestId = getRequestId(request);

  try {
    const supabase = await createClient();
    const repo = createSupabaseAppointmentsRepository(supabase);
    return await handleAppointmentsGet(repo, requestId);
  } catch {
    return createErrorResponse(
      new ApiError({
        code: "APPOINTMENTS_READ_FAILED",
        message: "Unable to load appointments.",
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

export async function handleAppointmentsGet(
  repo: AppointmentsRepository,
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

  if (role === "patient") {
    const patientId = await repo.getPatientIdByUserId(user.id);
    if (!patientId) {
      return createReadResponse([], requestId);
    }

    const appointments = await repo.listAppointmentsForPatient(patientId);
    return createReadResponse(appointments, requestId);
  }

  if (role === "provider") {
    const appointments = await repo.listAppointmentsForProvider(user.id);
    return createReadResponse(appointments, requestId);
  }

  return createErrorResponse(
    new ApiError({
      code: "APPOINTMENTS_ACCESS_DENIED",
      message: "Role does not have appointment access.",
      status: 403,
    }),
    requestId,
  );
}

export async function handleAppointmentsMutation(
  repo: AppointmentsRepository,
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

  const parsedPayload = appointmentMutationSchema.safeParse(payload);

  if (!parsedPayload.success) {
    return createErrorResponse(
      createValidationError(parsedPayload.error),
      requestId,
    );
  }

  const role = getUserRole(user);

  if (role !== "patient") {
    return createErrorResponse(
      new ApiError({
        code: "APPOINTMENTS_ACCESS_DENIED",
        message: "Only patient role can manage appointment booking actions.",
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
        message: "Complete patient profile before managing appointments.",
        status: 400,
      }),
      requestId,
    );
  }

  switch (parsedPayload.data.action) {
    case "book":
      return handleBook(repo, requestId, patientId, parsedPayload.data);
    case "reschedule":
      return handleReschedule(repo, requestId, patientId, parsedPayload.data);
    case "cancel":
      return handleCancel(repo, requestId, patientId, parsedPayload.data);
  }
}

async function handleBook(
  repo: AppointmentsRepository,
  requestId: string,
  patientId: string,
  payload: Extract<AppointmentMutationInput, { action: "book" }>,
) {
  const slot = await repo.getSlotById(payload.slotId);

  if (!slot || !slot.isAvailable) {
    return createErrorResponse(
      new ApiError({
        code: "APPOINTMENT_SLOT_UNAVAILABLE",
        message: "Selected slot is unavailable.",
        status: 409,
      }),
      requestId,
    );
  }

  const appointment = await repo.createAppointment({
    patientId,
    providerId: slot.providerId,
    slotId: slot.id,
    startsAt: slot.startsAt,
    endsAt: slot.endsAt,
  });
  await repo.setSlotAvailability(slot.id, false);

  return createMutationResponse(appointment, requestId, "Appointment booked.");
}

async function handleReschedule(
  repo: AppointmentsRepository,
  requestId: string,
  patientId: string,
  payload: Extract<AppointmentMutationInput, { action: "reschedule" }>,
) {
  const appointment = await repo.getAppointmentById(payload.appointmentId);

  if (!appointment || appointment.patientId !== patientId) {
    return createErrorResponse(
      new ApiError({
        code: "APPOINTMENT_NOT_FOUND",
        message: "Appointment not found.",
        status: 404,
      }),
      requestId,
    );
  }

  const newSlot = await repo.getSlotById(payload.newSlotId);

  if (!newSlot || !newSlot.isAvailable) {
    return createErrorResponse(
      new ApiError({
        code: "APPOINTMENT_SLOT_UNAVAILABLE",
        message: "Selected slot is unavailable.",
        status: 409,
      }),
      requestId,
    );
  }

  await repo.setSlotAvailability(appointment.slotId, true);
  await repo.setSlotAvailability(newSlot.id, false);

  const updated = await repo.updateAppointment(appointment.id, {
    providerId: newSlot.providerId,
    slotId: newSlot.id,
    startsAt: newSlot.startsAt,
    endsAt: newSlot.endsAt,
    status: "confirmed",
  });

  return createMutationResponse(updated, requestId, "Appointment rescheduled.");
}

async function handleCancel(
  repo: AppointmentsRepository,
  requestId: string,
  patientId: string,
  payload: Extract<AppointmentMutationInput, { action: "cancel" }>,
) {
  const appointment = await repo.getAppointmentById(payload.appointmentId);

  if (!appointment || appointment.patientId !== patientId) {
    return createErrorResponse(
      new ApiError({
        code: "APPOINTMENT_NOT_FOUND",
        message: "Appointment not found.",
        status: 404,
      }),
      requestId,
    );
  }

  await repo.setSlotAvailability(appointment.slotId, true);
  const updated = await repo.updateAppointment(appointment.id, {
    status: "cancelled",
  });

  return createMutationResponse(updated, requestId, "Appointment cancelled.");
}

async function handleMutationRequest(request: Request) {
  const requestId = getRequestId(request);

  try {
    const payload = await parseJsonBody(request);
    const supabase = await createClient();
    const repo = createSupabaseAppointmentsRepository(supabase);
    return await handleAppointmentsMutation(repo, requestId, payload);
  } catch (error) {
    const apiError =
      error instanceof ApiError
        ? error
        : new ApiError({
            code: "APPOINTMENTS_MUTATION_FAILED",
            message: "Unable to update appointment.",
            status: 500,
          });

    return createErrorResponse(apiError, requestId);
  }
}

function createSupabaseAppointmentsRepository(
  supabase: Awaited<ReturnType<typeof createClient>>,
): AppointmentsRepository {
  return {
    async getAuthUser() {
      const { data, error } = await supabase.auth.getUser();
      if (error) return null;
      return data.user;
    },
    async getPatientIdByUserId(userId: string) {
      const { data, error } = await supabase
        .from("patients")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      if (error || !data) return null;
      return data.id;
    },
    async getSlotById(slotId: string) {
      const { data, error } = await supabase
        .from("provider_availability_slots")
        .select("id,provider_id,starts_at,ends_at,is_available")
        .eq("id", slotId)
        .maybeSingle();
      if (error || !data) return null;
      return {
        id: data.id,
        providerId: data.provider_id,
        startsAt: data.starts_at,
        endsAt: data.ends_at,
        isAvailable: data.is_available,
      };
    },
    async setSlotAvailability(slotId, isAvailable) {
      const { error } = await supabase
        .from("provider_availability_slots")
        .update({ is_available: isAvailable })
        .eq("id", slotId);
      if (error) {
        throw new ApiError({
          code: "APPOINTMENT_SLOT_UPDATE_FAILED",
          message: "Unable to update slot availability.",
          status: 500,
        });
      }
    },
    async createAppointment(input) {
      const { data, error } = await supabase
        .from("appointments")
        .insert({
          patient_id: input.patientId,
          provider_id: input.providerId,
          slot_id: input.slotId,
          starts_at: input.startsAt,
          ends_at: input.endsAt,
          status: "confirmed",
        })
        .select("id,patient_id,provider_id,slot_id,starts_at,ends_at,status")
        .single();
      if (error || !data) {
        throw new ApiError({
          code: "APPOINTMENT_CREATE_FAILED",
          message: "Unable to create appointment.",
          status: 500,
        });
      }
      return mapAppointmentRecord(data);
    },
    async getAppointmentById(appointmentId) {
      const { data, error } = await supabase
        .from("appointments")
        .select("id,patient_id,provider_id,slot_id,starts_at,ends_at,status")
        .eq("id", appointmentId)
        .maybeSingle();
      if (error || !data) return null;
      return mapAppointmentRecord(data);
    },
    async updateAppointment(appointmentId, input) {
      const mapped = {
        provider_id: input.providerId,
        slot_id: input.slotId,
        starts_at: input.startsAt,
        ends_at: input.endsAt,
        status: input.status,
      };
      const { data, error } = await supabase
        .from("appointments")
        .update(mapped)
        .eq("id", appointmentId)
        .select("id,patient_id,provider_id,slot_id,starts_at,ends_at,status")
        .single();
      if (error || !data) {
        throw new ApiError({
          code: "APPOINTMENT_UPDATE_FAILED",
          message: "Unable to update appointment.",
          status: 500,
        });
      }
      return mapAppointmentRecord(data);
    },
    async listAppointmentsForPatient(patientId) {
      const { data, error } = await supabase
        .from("appointments")
        .select("id,patient_id,provider_id,slot_id,starts_at,ends_at,status")
        .eq("patient_id", patientId)
        .order("starts_at", { ascending: true });
      if (error || !data) return [];
      return data.map(mapAppointmentRecord);
    },
    async listAppointmentsForProvider(providerId) {
      const { data, error } = await supabase
        .from("appointments")
        .select("id,patient_id,provider_id,slot_id,starts_at,ends_at,status")
        .eq("provider_id", providerId)
        .order("starts_at", { ascending: true });
      if (error || !data) return [];
      return data.map(mapAppointmentRecord);
    },
  };
}

function mapAppointmentRecord(row: {
  id: string;
  patient_id: string;
  provider_id: string;
  slot_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
}): AppointmentRecord {
  return appointmentRecordSchema.parse({
    id: row.id,
    patientId: row.patient_id,
    providerId: row.provider_id,
    slotId: row.slot_id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
  });
}

async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw createJsonBodyError();
  }
}
