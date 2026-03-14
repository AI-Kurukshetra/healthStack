import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isPlatformAdmin } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { appointmentRecordSchema } from "@/lib/validations/appointment.schema";
import { medicalRecordSummarySchema } from "@/lib/validations/medical-record.schema";
import { patientRecordSchema } from "@/lib/validations/patient.schema";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Admin Patient Details | Health Stack",
};

type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
};

export default async function AdminPatientDetailsPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = await params;
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!isPlatformAdmin(authData.user)) {
    return <AccessDenied message="Platform admin role required." />;
  }

  const adminClient = createAdminClient();

  const { data: patientRow } = await adminClient
    .from("patients")
    .select(
      "id,user_id,organization_id,first_name,last_name,date_of_birth,created_at,updated_at",
    )
    .eq("id", patientId)
    .maybeSingle();

  if (!patientRow) {
    return (
      <Card className="border-slate-900/10 bg-white/75 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-cyan-950">Patient not found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          <p>Unable to locate this patient record.</p>
          <Link
            href="/admin/patients"
            className="inline-block text-cyan-900 underline underline-offset-4"
          >
            Back to patient directory
          </Link>
        </CardContent>
      </Card>
    );
  }

  const patient = patientRecordSchema.parse({
    id: patientRow.id,
    userId: patientRow.user_id,
    firstName: patientRow.first_name,
    lastName: patientRow.last_name,
    dateOfBirth: patientRow.date_of_birth,
    createdAt: patientRow.created_at,
    updatedAt: patientRow.updated_at,
  });

  const [{ data: organizationRow }, { data: appointmentRows }, { data: noteRows }] =
    await Promise.all([
      adminClient
        .from("organizations")
        .select("id,name,slug")
        .eq("id", patientRow.organization_id)
        .maybeSingle(),
      adminClient
        .from("appointments")
        .select("id,patient_id,provider_id,slot_id,starts_at,ends_at,status")
        .eq("patient_id", patientId)
        .order("starts_at", { ascending: false }),
      adminClient
        .from("clinical_notes")
        .select(
          "id,encounter_id,patient_id,provider_id,note_type,content,version,created_at,updated_at",
        )
        .eq("patient_id", patientId)
        .order("updated_at", { ascending: false }),
    ]);

  const organization = organizationRow as OrganizationRow | null;

  const appointments = (appointmentRows ?? []).map((row) =>
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

  const patientHistory = (noteRows ?? []).map((row) =>
    medicalRecordSummarySchema.parse({
      id: row.id,
      encounterId: row.encounter_id,
      patientId: row.patient_id,
      providerId: row.provider_id,
      noteType: row.note_type,
      summary: row.content.length <= 220 ? row.content : `${row.content.slice(0, 217)}...`,
      version: row.version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }),
  );

  return (
    <div className="grid gap-4">
      <Card className="border-slate-900/10 bg-white/75 backdrop-blur-sm">
        <CardHeader className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Patient Details</p>
          <CardTitle className="text-cyan-950">
            {patient.firstName} {patient.lastName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700">
          <p>DOB: {new Date(patient.dateOfBirth).toLocaleDateString()}</p>
          <p>
            Organization: {organization?.name ?? "Unknown"} ({organization?.slug ?? "n/a"})
          </p>
          <Link
            href="/admin/patients"
            className="inline-block text-cyan-900 underline underline-offset-4"
          >
            Back to patient directory
          </Link>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-slate-900/10 bg-white/75 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-cyan-950">Appointments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            {appointments.length === 0 ? (
              <p>No appointments found for this patient.</p>
            ) : (
              <ul className="space-y-2">
                {appointments.map((appointment) => (
                  <li
                    key={appointment.id}
                    className="rounded-xl border border-slate-900/10 bg-white p-3"
                  >
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Status: {appointment.status}
                    </p>
                    <p className="font-medium text-slate-950">
                      {new Date(appointment.startsAt).toLocaleString()} -{" "}
                      {new Date(appointment.endsAt).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-900/10 bg-white/75 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-cyan-950">Patient History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            {patientHistory.length === 0 ? (
              <p>No clinical notes found for this patient.</p>
            ) : (
              <ul className="space-y-2">
                {patientHistory.map((record) => (
                  <li
                    key={record.id}
                    className="rounded-xl border border-slate-900/10 bg-white p-3"
                  >
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      {record.noteType} note (v{record.version})
                    </p>
                    <p className="text-slate-800">{record.summary}</p>
                    <p className="text-xs text-slate-500">
                      Updated {new Date(record.updatedAt).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AccessDenied({ message }: { message: string }) {
  return (
    <Card className="border-slate-900/10 bg-white/75 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-cyan-950">Access denied</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-slate-700">{message}</CardContent>
    </Card>
  );
}
