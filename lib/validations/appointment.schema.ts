import { z } from "zod";

export const appointmentSchema = z.object({
  patientId: z.string().uuid(),
  providerId: z.string().uuid(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
});

export const availabilityQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const availabilitySlotSchema = z
  .object({
    id: z.string().uuid(),
    providerId: z.string().uuid(),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    isAvailable: z.literal(true),
  })
  .refine((value) => Date.parse(value.startsAt) < Date.parse(value.endsAt), {
    message: "Slot end time must be after start time",
  });

export const appointmentRecordSchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().uuid(),
  providerId: z.string().uuid(),
  slotId: z.string().uuid(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  status: z.enum(["confirmed", "cancelled"]),
});

export const appointmentMutationSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("book"),
    slotId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("reschedule"),
    appointmentId: z.string().uuid(),
    newSlotId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("cancel"),
    appointmentId: z.string().uuid(),
  }),
]);

export const availabilityReadResponseSchema = z.object({
  data: z.array(availabilitySlotSchema),
  meta: z.object({
    requestId: z.string().min(1),
    count: z.number().int().nonnegative(),
  }),
});

export type AppointmentInput = z.infer<typeof appointmentSchema>;
export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;
export type AvailabilitySlot = z.infer<typeof availabilitySlotSchema>;
export type AppointmentRecord = z.infer<typeof appointmentRecordSchema>;
export type AppointmentMutationInput = z.infer<typeof appointmentMutationSchema>;
