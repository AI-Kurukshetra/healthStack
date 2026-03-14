import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { appointmentRecordSchema } from "@/lib/validations/appointment.schema";
import { encounterRecordSchema } from "@/lib/validations/encounter.schema";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Provider Dashboard | Health Stack",
};

export default async function ProviderDashboardPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const role = getUserRole(data.user);
  const nowIso = new Date().toISOString();

  if (role !== "provider") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access denied</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Provider role required to access this dashboard.
        </CardContent>
      </Card>
    );
  }

  const { data: rows } = await supabase
    .from("appointments")
    .select("id,patient_id,provider_id,slot_id,starts_at,ends_at,status")
    .eq("provider_id", data.user!.id)
    .gte("ends_at", nowIso)
    .order("starts_at", { ascending: true });

  const appointments = (rows ?? []).map((row) =>
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
    .eq("provider_id", data.user!.id);
  const encountersByAppointmentId = new Map(
    (encounterRows ?? []).map((row) => {
      const encounter = encounterRecordSchema.parse({
        id: row.id,
        appointmentId: row.appointment_id,
        patientId: row.patient_id,
        providerId: row.provider_id,
        status: row.status,
        startedAt: row.started_at,
        patientJoinedAt: row.patient_joined_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });
      return [encounter.appointmentId, encounter] as const;
    }),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Provider Dashboard Queue</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        {appointments.length === 0 ? (
          <p>No upcoming appointments in your queue.</p>
        ) : (
          <ul className="space-y-2">
            {appointments.map((appointment) => (
              <li key={appointment.id} className="rounded-md border p-3">
                {(() => {
                  const encounter = encountersByAppointmentId.get(appointment.id);
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
                <p className="font-medium text-foreground">
                  Patient: {appointment.patientId}
                </p>
                <p>
                  {new Date(appointment.startsAt).toLocaleString()} -{" "}
                  {new Date(appointment.endsAt).toLocaleString()}
                </p>
                <p className="text-xs uppercase tracking-wide">
                  Status:{" "}
                  {appointment.status === "confirmed"
                    ? "Confirmed"
                    : "Cancelled"}
                </p>
                {(() => {
                  const encounter = encountersByAppointmentId.get(appointment.id);
                  if (!encounter) {
                    return null;
                  }

                  return (
                    <div className="mt-2 flex flex-wrap gap-3">
                      {(encounter.status === "active" ||
                        encounter.status === "connected") && (
                        <Link
                          className="inline-block text-xs text-primary underline underline-offset-4"
                          href={`/encounters/${encounter.id}/video`}
                        >
                          Open session link
                        </Link>
                      )}
                      <Link
                        className="inline-block text-xs text-primary underline underline-offset-4"
                        href={`/provider/notes/${encounter.id}`}
                      >
                        Open clinical note
                      </Link>
                    </div>
                  );
                })()}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
