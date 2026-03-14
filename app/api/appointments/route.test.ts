import { describe, expect, it } from "vitest";
import {
  handleAppointmentsGet,
  handleAppointmentsMutation,
} from "@/app/api/appointments/route";

type Repo = Parameters<typeof handleAppointmentsGet>[0];

function createRepo(overrides?: Partial<Repo>): Repo {
  return {
    getAuthUser: async () => null,
    logAuditEvent: async () => undefined,
    getPatientIdByUserId: async () => null,
    getSlotById: async () => null,
    setSlotAvailability: async () => undefined,
    createAppointment: async () => ({
      id: "26413f49-c86f-4de0-8ce6-ec7bb4d8fdf0",
      patientId: "7f961b6b-b271-4c7c-86f9-29f0f4572f4d",
      providerId: "4f28c9cc-8de6-4e24-bf75-b4502bb99825",
      slotId: "5d4a25d8-279b-45f4-b310-f3cc696c2160",
      startsAt: "2026-03-20T10:00:00.000Z",
      endsAt: "2026-03-20T10:30:00.000Z",
      status: "confirmed",
    }),
    getAppointmentById: async () => null,
    updateAppointment: async () => ({
      id: "26413f49-c86f-4de0-8ce6-ec7bb4d8fdf0",
      patientId: "7f961b6b-b271-4c7c-86f9-29f0f4572f4d",
      providerId: "4f28c9cc-8de6-4e24-bf75-b4502bb99825",
      slotId: "5d4a25d8-279b-45f4-b310-f3cc696c2160",
      startsAt: "2026-03-20T10:00:00.000Z",
      endsAt: "2026-03-20T10:30:00.000Z",
      status: "confirmed",
    }),
    listAppointmentsForPatient: async () => [],
    listAppointmentsForProvider: async () => [],
    ...overrides,
  };
}

describe("appointments route", () => {
  it("creates booking when slot is available", async () => {
    const auditEvents: Array<{ eventType: string; action: string }> = [];
    const response = await handleAppointmentsMutation(
      createRepo({
        logAuditEvent: async (event) => {
          auditEvents.push({ eventType: event.eventType, action: event.action });
        },
        getAuthUser: async () => ({
          id: "7f961b6b-b271-4c7c-86f9-29f0f4572f4d",
          user_metadata: { role: "patient" },
        }),
        getPatientIdByUserId: async () =>
          "7f961b6b-b271-4c7c-86f9-29f0f4572f4d",
        getSlotById: async () => ({
          id: "5d4a25d8-279b-45f4-b310-f3cc696c2160",
          providerId: "4f28c9cc-8de6-4e24-bf75-b4502bb99825",
          startsAt: "2026-03-20T10:00:00.000Z",
          endsAt: "2026-03-20T10:30:00.000Z",
          isAvailable: true,
        }),
      }),
      "req-book",
      { action: "book", slotId: "5d4a25d8-279b-45f4-b310-f3cc696c2160" },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toBe("Appointment booked.");
    expect(body.data.status).toBe("confirmed");
    expect(auditEvents).toEqual([
      { eventType: "appointments.booked", action: "book" },
    ]);
  });

  it("reschedules existing appointment", async () => {
    const response = await handleAppointmentsMutation(
      createRepo({
        getAuthUser: async () => ({
          id: "7f961b6b-b271-4c7c-86f9-29f0f4572f4d",
          user_metadata: { role: "patient" },
        }),
        getPatientIdByUserId: async () =>
          "7f961b6b-b271-4c7c-86f9-29f0f4572f4d",
        getAppointmentById: async () => ({
          id: "26413f49-c86f-4de0-8ce6-ec7bb4d8fdf0",
          patientId: "7f961b6b-b271-4c7c-86f9-29f0f4572f4d",
          providerId: "4f28c9cc-8de6-4e24-bf75-b4502bb99825",
          slotId: "5d4a25d8-279b-45f4-b310-f3cc696c2160",
          startsAt: "2026-03-20T10:00:00.000Z",
          endsAt: "2026-03-20T10:30:00.000Z",
          status: "confirmed",
        }),
        getSlotById: async (slotId) => ({
          id: slotId,
          providerId: "4f28c9cc-8de6-4e24-bf75-b4502bb99825",
          startsAt: "2026-03-21T10:00:00.000Z",
          endsAt: "2026-03-21T10:30:00.000Z",
          isAvailable: true,
        }),
        updateAppointment: async () => ({
          id: "26413f49-c86f-4de0-8ce6-ec7bb4d8fdf0",
          patientId: "7f961b6b-b271-4c7c-86f9-29f0f4572f4d",
          providerId: "4f28c9cc-8de6-4e24-bf75-b4502bb99825",
          slotId: "1d4a25d8-279b-45f4-b310-f3cc696c2160",
          startsAt: "2026-03-21T10:00:00.000Z",
          endsAt: "2026-03-21T10:30:00.000Z",
          status: "confirmed",
        }),
      }),
      "req-reschedule",
      {
        action: "reschedule",
        appointmentId: "26413f49-c86f-4de0-8ce6-ec7bb4d8fdf0",
        newSlotId: "1d4a25d8-279b-45f4-b310-f3cc696c2160",
      },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toBe("Appointment rescheduled.");
    expect(body.data.slotId).toBe("1d4a25d8-279b-45f4-b310-f3cc696c2160");
  });

  it("cancels existing appointment", async () => {
    const response = await handleAppointmentsMutation(
      createRepo({
        getAuthUser: async () => ({
          id: "7f961b6b-b271-4c7c-86f9-29f0f4572f4d",
          user_metadata: { role: "patient" },
        }),
        getPatientIdByUserId: async () =>
          "7f961b6b-b271-4c7c-86f9-29f0f4572f4d",
        getAppointmentById: async () => ({
          id: "26413f49-c86f-4de0-8ce6-ec7bb4d8fdf0",
          patientId: "7f961b6b-b271-4c7c-86f9-29f0f4572f4d",
          providerId: "4f28c9cc-8de6-4e24-bf75-b4502bb99825",
          slotId: "5d4a25d8-279b-45f4-b310-f3cc696c2160",
          startsAt: "2026-03-20T10:00:00.000Z",
          endsAt: "2026-03-20T10:30:00.000Z",
          status: "confirmed",
        }),
        updateAppointment: async () => ({
          id: "26413f49-c86f-4de0-8ce6-ec7bb4d8fdf0",
          patientId: "7f961b6b-b271-4c7c-86f9-29f0f4572f4d",
          providerId: "4f28c9cc-8de6-4e24-bf75-b4502bb99825",
          slotId: "5d4a25d8-279b-45f4-b310-f3cc696c2160",
          startsAt: "2026-03-20T10:00:00.000Z",
          endsAt: "2026-03-20T10:30:00.000Z",
          status: "cancelled",
        }),
      }),
      "req-cancel",
      {
        action: "cancel",
        appointmentId: "26413f49-c86f-4de0-8ce6-ec7bb4d8fdf0",
      },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toBe("Appointment cancelled.");
    expect(body.data.status).toBe("cancelled");
  });

  it("returns provider appointments on GET for provider role", async () => {
    const response = await handleAppointmentsGet(
      createRepo({
        getAuthUser: async () => ({
          id: "4f28c9cc-8de6-4e24-bf75-b4502bb99825",
          user_metadata: { role: "provider" },
        }),
        listAppointmentsForProvider: async () => [
          {
            id: "26413f49-c86f-4de0-8ce6-ec7bb4d8fdf0",
            patientId: "7f961b6b-b271-4c7c-86f9-29f0f4572f4d",
            providerId: "4f28c9cc-8de6-4e24-bf75-b4502bb99825",
            slotId: "5d4a25d8-279b-45f4-b310-f3cc696c2160",
            startsAt: "2026-03-20T10:00:00.000Z",
            endsAt: "2026-03-20T10:30:00.000Z",
            status: "confirmed",
          },
        ],
      }),
      "req-provider-list",
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
  });
});
