import { z } from "zod";

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

export const patientProfilePayloadSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  dateOfBirth: z
    .string()
    .regex(dateOnlyPattern, "Date of birth must be in YYYY-MM-DD format"),
});

export const patientRecordSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.string().regex(dateOnlyPattern),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const patientReadResponseSchema = z.object({
  data: patientRecordSchema.nullable(),
  meta: z.object({
    requestId: z.string().min(1),
  }),
});

export const patientMutationResponseSchema = z.object({
  data: patientRecordSchema,
  message: z.string().min(1),
  requestId: z.string().min(1),
});

export type PatientProfileInput = z.infer<typeof patientProfilePayloadSchema>;
export type PatientRecord = z.infer<typeof patientRecordSchema>;
