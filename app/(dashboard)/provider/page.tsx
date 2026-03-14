import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { appointmentRecordSchema } from "@/lib/validations/appointment.schema";
import type { Metadata } from "next";

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
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
