import {
  patientMutationResponseSchema,
  patientReadResponseSchema,
  patientProfilePayloadSchema,
  type PatientProfileInput,
} from "@/lib/validations/patient.schema";
import { z } from "zod";

const apiErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
  requestId: z.string(),
});

export class PatientsClientError extends Error {
  readonly code: string;
  readonly requestId?: string;

  constructor(options: { code: string; message: string; requestId?: string }) {
    super(options.message);
    this.name = "PatientsClientError";
    this.code = options.code;
    this.requestId = options.requestId;
  }
}

export async function getPatientProfile() {
  const response = await fetch("/api/patients", {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  const payload = await response.json();

  if (!response.ok) {
    throw toPatientsClientError(payload);
  }

  const parsed = patientReadResponseSchema.safeParse(payload);

  if (!parsed.success) {
    throw new PatientsClientError({
      code: "PATIENTS_RESPONSE_INVALID",
      message: "Invalid patients response.",
    });
  }

  return parsed.data;
}

export async function savePatientProfile(input: PatientProfileInput) {
  const validated = patientProfilePayloadSchema.parse(input);
  const response = await fetch("/api/patients", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(validated),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw toPatientsClientError(payload);
  }

  const parsed = patientMutationResponseSchema.safeParse(payload);

  if (!parsed.success) {
    throw new PatientsClientError({
      code: "PATIENTS_RESPONSE_INVALID",
      message: "Invalid patients response.",
    });
  }

  return parsed.data;
}

function toPatientsClientError(payload: unknown): PatientsClientError {
  const parsed = apiErrorResponseSchema.safeParse(payload);

  if (parsed.success) {
    return new PatientsClientError({
      code: parsed.data.error.code,
      message: parsed.data.error.message,
      requestId: parsed.data.requestId,
    });
  }

  return new PatientsClientError({
    code: "PATIENTS_REQUEST_FAILED",
    message: "Patient request failed.",
  });
}
