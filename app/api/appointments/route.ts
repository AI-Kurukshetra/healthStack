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
  getSlotById: (slotId: string, organizationId: string) => Promise<SlotRecord | null>;
  setSlotAvailability: (
    slotId: string,
    isAvailable: boolean,
    organizationId: string,
  ) => Promise<void>;
  createAppointment: (input: {
    organizationId: string;
    patientId: string;
    providerId: string;
    slotId: string;
    startsAt: string;
    endsAt: string;
  }) => Promise<AppointmentRecord>;
  getAppointmentById: (
    appointmentId: string,
    organizationId: string,
  ) => Promise<AppointmentRecord | null>;
  updateAppointment: (
    appointmentId: string,
    organizationId: string,
    input: Partial<{
      providerId: string;
      slotId: string;
      startsAt: string;
      endsAt: string;
      status: "confirmed" | "cancelled";
    }>,
  ) => Promise<AppointmentRecord>;
  listAppointmentsForPatient: (
    patientId: string,
    organizationId: string,
  ) => Promise<AppointmentRecord[]>;
  listAppointmentsForProvider: (
    providerId: string,
    organizationId: string,
  ) => Promise<AppointmentRecord[]>;
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

    const appointments = await repo.listAppointmentsForPatient(
      patientId,
      organizationId,
    );
    return createReadResponse(appointments, requestId);
  }

  if (role === "provider") {
    const appointments = await repo.listAppointmentsForProvider(
      user.id,
      organizationId,
    );
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
      return handleBook(
        repo,
        requestId,
        organizationId,
        patientId,
        user.id,
        parsedPayload.data,
      );
    case "reschedule":
      return handleReschedule(
        repo,
        requestId,
        organizationId,
        patientId,
        user.id,
        parsedPayload.data,
      );
    case "cancel":
      return handleCancel(
        repo,
        requestId,
        organizationId,
        patientId,
        user.id,
        parsedPayload.data,
      );
  }
}

async function handleBook(
  repo: AppointmentsRepository,
  requestId: string,
  organizationId: string,
  patientId: string,
  actorUserId: string,
  payload: Extract<AppointmentMutationInput, { action: "book" }>,
) {
  const slot = await repo.getSlotById(payload.slotId, organizationId);

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
    organizationId,
    patientId,
    providerId: slot.providerId,
    slotId: slot.id,
    startsAt: slot.startsAt,
    endsAt: slot.endsAt,
  });
  await repo.setSlotAvailability(slot.id, false, organizationId);
  await repo.logAuditEvent({
    eventType: "appointments.booked",
    action: "book",
    resourceType: "appointment",
    resourceId: appointment.id,
    actorId: actorUserId,
    actorRole: "patient",
    requestId,
    organizationId,
    metadata: { slotId: slot.id, providerId: slot.providerId },
  });

  return createMutationResponse(appointment, requestId, "Appointment booked.");
}

async function handleReschedule(
  repo: AppointmentsRepository,
  requestId: string,
  organizationId: string,
  patientId: string,
  actorUserId: string,
  payload: Extract<AppointmentMutationInput, { action: "reschedule" }>,
) {
  const appointment = await repo.getAppointmentById(
    payload.appointmentId,
    organizationId,
  );

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

  const newSlot = await repo.getSlotById(payload.newSlotId, organizationId);

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

  await repo.setSlotAvailability(appointment.slotId, true, organizationId);
  await repo.setSlotAvailability(newSlot.id, false, organizationId);

  const updated = await repo.updateAppointment(appointment.id, organizationId, {
    providerId: newSlot.providerId,
    slotId: newSlot.id,
    startsAt: newSlot.startsAt,
    endsAt: newSlot.endsAt,
    status: "confirmed",
  });
  await repo.logAuditEvent({
    eventType: "appointments.rescheduled",
    action: "reschedule",
    resourceType: "appointment",
    resourceId: updated.id,
    actorId: actorUserId,
    actorRole: "patient",
    requestId,
    organizationId,
    metadata: {
      oldSlotId: appointment.slotId,
      newSlotId: newSlot.id,
      providerId: updated.providerId,
    },
  });

  return createMutationResponse(updated, requestId, "Appointment rescheduled.");
}

async function handleCancel(
  repo: AppointmentsRepository,
  requestId: string,
  organizationId: string,
  patientId: string,
  actorUserId: string,
  payload: Extract<AppointmentMutationInput, { action: "cancel" }>,
) {
  const appointment = await repo.getAppointmentById(
    payload.appointmentId,
    organizationId,
  );

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

  await repo.setSlotAvailability(appointment.slotId, true, organizationId);
  const updated = await repo.updateAppointment(appointment.id, organizationId, {
    status: "cancelled",
  });
  await repo.logAuditEvent({
    eventType: "appointments.cancelled",
    action: "cancel",
    resourceType: "appointment",
    resourceId: updated.id,
    actorId: actorUserId,
    actorRole: "patient",
    requestId,
    organizationId,
    metadata: { slotId: updated.slotId },
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
    async getCurrentOrganizationId(userId) {
      return getPrimaryOrganizationIdForUser(supabase, userId);
    },
    async logAuditEvent(event) {
      await insertAuditEvent(supabase, event);
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
    async getSlotById(slotId: string, organizationId: string) {
      const { data, error } = await supabase
        .from("provider_availability_slots")
        .select("id,provider_id,starts_at,ends_at,is_available")
        .eq("id", slotId)
        .eq("organization_id", organizationId)
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
    async setSlotAvailability(slotId, isAvailable, organizationId) {
      const { error } = await supabase
        .from("provider_availability_slots")
        .update({ is_available: isAvailable })
        .eq("id", slotId)
        .eq("organization_id", organizationId);
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
          organization_id: input.organizationId,
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
    async getAppointmentById(appointmentId, organizationId) {
      const { data, error } = await supabase
        .from("appointments")
        .select("id,patient_id,provider_id,slot_id,starts_at,ends_at,status")
        .eq("id", appointmentId)
        .eq("organization_id", organizationId)
        .maybeSingle();
      if (error || !data) return null;
      return mapAppointmentRecord(data);
    },
    async updateAppointment(appointmentId, organizationId, input) {
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
        .eq("organization_id", organizationId)
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
    async listAppointmentsForPatient(patientId, organizationId) {
      const { data, error } = await supabase
        .from("appointments")
        .select("id,patient_id,provider_id,slot_id,starts_at,ends_at,status")
        .eq("patient_id", patientId)
        .eq("organization_id", organizationId)
        .order("starts_at", { ascending: true });
      if (error || !data) return [];
      return data.map(mapAppointmentRecord);
    },
    async listAppointmentsForProvider(providerId, organizationId) {
      const { data, error } = await supabase
        .from("appointments")
        .select("id,patient_id,provider_id,slot_id,starts_at,ends_at,status")
        .eq("provider_id", providerId)
        .eq("organization_id", organizationId)
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

async function resolveOrganizationId(
  repo: Pick<AppointmentsRepository, "getCurrentOrganizationId">,
  userId: string,
): Promise<string | null> {
  if (!repo.getCurrentOrganizationId) {
    return "legacy-org-context";
  }

  return repo.getCurrentOrganizationId(userId);
}
