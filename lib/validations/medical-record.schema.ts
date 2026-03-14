import { z } from "zod";

export const medicalRecordSchema = z.object({
  patientId: z.string().uuid(),
  summary: z.string().min(1),
});

export type MedicalRecordInput = z.infer<typeof medicalRecordSchema>;
