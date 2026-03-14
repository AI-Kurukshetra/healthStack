import { z } from "zod";

export const appointmentSchema = z.object({
  patientId: z.string().uuid(),
  providerId: z.string().uuid(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
});

export type AppointmentInput = z.infer<typeof appointmentSchema>;
