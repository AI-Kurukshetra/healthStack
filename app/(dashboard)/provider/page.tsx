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
      <Card className="border-slate-900/10 bg-white/75 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-cyan-950">Access denied</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-700">
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
    <div className="grid gap-4">
      <Card className="border-slate-900/10 bg-white/75 backdrop-blur-sm">
        <CardHeader className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Provider Workflow
          </p>
          <CardTitle className="text-cyan-950">Today&apos;s Care Queue</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-slate-700 md:grid-cols-3">
          <div className="rounded-xl border border-slate-900/10 bg-white p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Upcoming appointments
            </p>
            <p className="mt-1 text-2xl font-semibold text-cyan-950">
              {appointments.length}
            </p>
          </div>
          <div className="rounded-xl border border-slate-900/10 bg-white p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Active encounters
            </p>
            <p className="mt-1 text-2xl font-semibold text-cyan-950">
              {
                appointments.filter((appointment) => {
                  const encounter = encountersByAppointmentId.get(appointment.id);
                  return (
                    encounter?.status === "active" ||
                    encounter?.status === "connected"
                  );
                }).length
              }
            </p>
          </div>
          <div className="rounded-xl border border-slate-900/10 bg-white p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Next actions
            </p>
            <p className="mt-1 text-xs">
              Launch session links and keep SOAP/progress notes current.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-900/10 bg-white/75 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-cyan-950">Upcoming Appointments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          {appointments.length === 0 ? (
            <p>No upcoming appointments in your queue.</p>
          ) : (
            <ul className="space-y-2">
              {appointments.map((appointment) => (
                <li key={appointment.id} className="rounded-xl border border-slate-900/10 bg-white p-3">
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
                  <p className="mt-1 font-medium text-slate-950">
                    Patient: {appointment.patientId}
                  </p>
                  <p>
                    {new Date(appointment.startsAt).toLocaleString()} -{" "}
                    {new Date(appointment.endsAt).toLocaleString()}
                  </p>
                  <p className="text-xs uppercase tracking-wide">
                    Status:{" "}
                    {appointment.status === "confirmed" ? "Confirmed" : "Cancelled"}
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
                            className="inline-block text-xs text-cyan-900 underline underline-offset-4"
                            href={`/encounters/${encounter.id}/video`}
                          >
                            Open session link
                          </Link>
                        )}
                        <Link
                          className="inline-block text-xs text-cyan-900 underline underline-offset-4"
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
    </div>
  );
}
