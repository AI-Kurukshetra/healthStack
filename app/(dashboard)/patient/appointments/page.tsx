import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import {
  appointmentRecordSchema,
  availabilitySlotSchema,
} from "@/lib/validations/appointment.schema";
import { encounterRecordSchema } from "@/lib/validations/encounter.schema";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Patient Appointments | Health Stack",
};

export default async function PatientAppointmentsPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const nowIso = new Date().toISOString();
  const { data } = await supabase
    .from("provider_availability_slots")
    .select("id,provider_id,starts_at,ends_at,is_available")
    .eq("is_available", true)
    .gte("starts_at", nowIso)
    .order("starts_at", { ascending: true });

  const slots = (data ?? []).map((row) =>
    availabilitySlotSchema.parse({
      id: row.id,
      providerId: row.provider_id,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      isAvailable: row.is_available,
    }),
  );

  let appointments: Array<
    ReturnType<typeof appointmentRecordSchema.parse>
  > = [];
  let encounterByAppointmentId = new Map<
    string,
    ReturnType<typeof encounterRecordSchema.parse>
  >();

  if (authData.user) {
    const { data: patient } = await supabase
      .from("patients")
      .select("id")
      .eq("user_id", authData.user.id)
      .maybeSingle();

    if (patient) {
      const { data: appointmentRows } = await supabase
        .from("appointments")
        .select("id,patient_id,provider_id,slot_id,starts_at,ends_at,status")
        .eq("patient_id", patient.id)
        .order("starts_at", { ascending: true });

      appointments = (appointmentRows ?? []).map((row) =>
        appointmentRecordSchema.parse({
          id: row.id,
          patientId: row.patient_id,
          providerId: row.provider_id,
          slotId: row.slot_id,
          startsAt: row.starts_at,
          endsAt: row.ends_at,
          status: row.status,
        }),
      );

      const { data: encounterRows } = await supabase
        .from("encounters")
        .select(
          "id,appointment_id,patient_id,provider_id,status,started_at,patient_joined_at,created_at,updated_at",
        )
        .eq("patient_id", patient.id);
      const mapped = (encounterRows ?? []).map((row) =>
        encounterRecordSchema.parse({
          id: row.id,
          appointmentId: row.appointment_id,
          patientId: row.patient_id,
          providerId: row.provider_id,
          status: row.status,
          startedAt: row.started_at,
          patientJoinedAt: row.patient_joined_at,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }),
      );
      encounterByAppointmentId = new Map(
        mapped.map((encounter) => [encounter.appointmentId, encounter]),
      );
    }
  }

  const upcomingAppointments = appointments.filter(
    (appointment) =>
      appointment.status === "confirmed" &&
      Date.parse(appointment.endsAt) >= Date.now(),
  );
  const historyAppointments = appointments.filter(
    (appointment) =>
      appointment.status === "cancelled" ||
      Date.parse(appointment.endsAt) < Date.now(),
  );

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Appointment Availability</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {slots.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No appointment slots are currently available. Please check back
              soon or contact support for scheduling guidance.
            </p>
          ) : (
            <ul className="space-y-2">
              {slots.map((slot) => (
                <li key={slot.id} className="rounded-md border p-3 text-sm">
                  <p className="font-medium">Provider: {slot.providerId}</p>
                  <p className="text-muted-foreground">
                    {new Date(slot.startsAt).toLocaleString()} -{" "}
                    {new Date(slot.endsAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Appointments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcomingAppointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You do not have upcoming appointments.
            </p>
          ) : (
            <ul className="space-y-2">
              {upcomingAppointments.map((appointment) => (
                <li key={appointment.id} className="rounded-md border p-3 text-sm">
                  {(() => {
                    const encounter = encounterByAppointmentId.get(appointment.id);
                    if (!encounter) {
                      return (
                        <p className="text-xs uppercase tracking-wide text-amber-600">
                          Encounter: not started
                        </p>
                      );
                    }

                    return (
                      <p className="text-xs uppercase tracking-wide text-emerald-700">
                        Encounter: {encounter.status}
                      </p>
                    );
                  })()}
                  <p className="font-medium">Provider: {appointment.providerId}</p>
                  <p className="text-muted-foreground">
                    {new Date(appointment.startsAt).toLocaleString()} -{" "}
                    {new Date(appointment.endsAt).toLocaleString()}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Status: {appointment.status}
                  </p>
                  {(() => {
                    const encounter = encounterByAppointmentId.get(appointment.id);
                    if (
                      !encounter ||
                      (encounter.status !== "active" &&
                        encounter.status !== "connected")
                    ) {
                      return null;
                    }

                    return (
                      <Link
                        className="mt-2 inline-block text-xs text-primary underline underline-offset-4"
                        href={`/encounters/${encounter.id}/video`}
                      >
                        Join consultation
                      </Link>
                    );
                  })()}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appointment History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Link
            className="inline-block text-xs text-primary underline underline-offset-4"
            href="/patient/records"
          >
            View record summaries
          </Link>
          {historyAppointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No past or cancelled appointments yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {historyAppointments.map((appointment) => (
                <li key={appointment.id} className="rounded-md border p-3 text-sm">
                  {(() => {
                    const encounter = encounterByAppointmentId.get(appointment.id);
                    if (!encounter) {
                      return null;
                    }

                    return (
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Encounter: {encounter.status}
                      </p>
                    );
                  })()}
                  <p className="font-medium">Provider: {appointment.providerId}</p>
                  <p className="text-muted-foreground">
                    {new Date(appointment.startsAt).toLocaleString()} -{" "}
                    {new Date(appointment.endsAt).toLocaleString()}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Status: {appointment.status}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
