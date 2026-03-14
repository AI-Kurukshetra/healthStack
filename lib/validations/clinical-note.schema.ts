import { z } from "zod";

export const clinicalNoteSchema = z.object({
  encounterId: z.string().uuid(),
  note: z.string().min(1),
});

export type ClinicalNoteInput = z.infer<typeof clinicalNoteSchema>;
