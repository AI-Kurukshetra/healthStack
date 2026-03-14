import { z } from "zod";

export const clinicalNoteTypeSchema = z.enum(["soap", "progress"]);

export const clinicalNoteDraftSchema = z.object({
  noteType: clinicalNoteTypeSchema,
  content: z.string().trim().min(1).max(8000),
});

export const clinicalNoteRecordSchema = z.object({
  id: z.string().uuid(),
  encounterId: z.string().uuid(),
  patientId: z.string().uuid(),
  providerId: z.string().uuid(),
  noteType: clinicalNoteTypeSchema,
  content: z.string().min(1),
  version: z.number().int().min(1),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export type ClinicalNoteDraftInput = z.infer<typeof clinicalNoteDraftSchema>;
export type ClinicalNoteRecord = z.infer<typeof clinicalNoteRecordSchema>;
