import { z } from "zod";

export const prescriptionRecordSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  patientId: z.string().uuid(),
  uploadedBy: z.string().uuid(),
  fileName: z.string().min(1),
  filePath: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  createdAt: z.string().datetime({ offset: true }),
  downloadUrl: z.string().url().nullable().optional(),
});

export type PrescriptionRecord = z.infer<typeof prescriptionRecordSchema>;
