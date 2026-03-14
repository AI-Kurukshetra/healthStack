import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import {
  appointmentRecordSchema,
  availabilitySlotSchema,
} from "@/lib/validations/appointment.schema";
import type { Metadata } from "next";

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

      <Card>
        <CardHeader>
          <CardTitle>Appointment History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {historyAppointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No past or cancelled appointments yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {historyAppointments.map((appointment) => (
                <li key={appointment.id} className="rounded-md border p-3 text-sm">
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
