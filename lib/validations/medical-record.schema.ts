import { z } from "zod";
import {
  clinicalNoteRecordSchema,
  clinicalNoteTypeSchema,
} from "@/lib/validations/clinical-note.schema";

export const medicalRecordMutationSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    encounterId: z.string().uuid(),
    noteType: clinicalNoteTypeSchema,
    content: z.string().trim().min(1).max(8000),
  }),
  z.object({
    action: z.literal("update"),
    noteId: z.string().uuid(),
    noteType: clinicalNoteTypeSchema,
    content: z.string().trim().min(1).max(8000),
  }),
]);

export const medicalRecordRecordSchema = clinicalNoteRecordSchema;

export const medicalRecordSummarySchema = z.object({
  id: z.string().uuid(),
  encounterId: z.string().uuid(),
  patientId: z.string().uuid(),
  providerId: z.string().uuid(),
  noteType: clinicalNoteTypeSchema,
  summary: z.string().min(1),
  version: z.number().int().min(1),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export type MedicalRecordMutationInput = z.infer<typeof medicalRecordMutationSchema>;
export type MedicalRecordRecord = z.infer<typeof medicalRecordRecordSchema>;
export type MedicalRecordSummary = z.infer<typeof medicalRecordSummarySchema>;
