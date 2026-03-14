import { z } from "zod";

export const encounterRecordSchema = z.object({
  id: z.string().uuid(),
  appointmentId: z.string().uuid(),
  patientId: z.string().uuid(),
  providerId: z.string().uuid(),
  status: z.enum(["active", "connected", "completed"]),
  startedAt: z.string().datetime({ offset: true }).nullable(),
  patientJoinedAt: z.string().datetime({ offset: true }).nullable(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export const encounterMutationSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("start"),
    appointmentId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("join"),
    encounterId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("complete"),
    encounterId: z.string().uuid(),
  }),
]);

export const encounterSessionQuerySchema = z.object({
  encounterId: z.string().uuid(),
});

export const encounterSessionResponseSchema = z.object({
  encounterId: z.string().uuid(),
  status: z.enum(["active", "connected"]),
  joinUrl: z.string().url(),
});

export type EncounterRecord = z.infer<typeof encounterRecordSchema>;
export type EncounterMutationInput = z.infer<typeof encounterMutationSchema>;
export type EncounterSessionQuery = z.infer<typeof encounterSessionQuerySchema>;
