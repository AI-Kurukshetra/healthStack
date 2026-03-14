import { z } from "zod";

export const patientProfileSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.string().min(1),
});

export type PatientProfileInput = z.infer<typeof patientProfileSchema>;
