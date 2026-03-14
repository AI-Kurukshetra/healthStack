import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserRole, isPlatformAdmin } from "@/lib/auth/roles";
import { getCurrentOrganizationId } from "@/lib/auth/tenant";
import { createClient } from "@/lib/supabase/server";
import { appointmentRecordSchema } from "@/lib/validations/appointment.schema";
import { medicalRecordSummarySchema } from "@/lib/validations/medical-record.schema";
import { patientRecordSchema } from "@/lib/validations/patient.schema";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Patient History | Health Stack",
};

export default async function ProviderPatientHistoryPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = await params;
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const role = getUserRole(authData.user);
  const organizationId = await getCurrentOrganizationId();

  if (!authData.user || !organizationId) {
    return <AccessDenied message="Organization context is required to view patient history." />;
  }

  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", authData.user.id)
    .maybeSingle();

  const membershipRole = membership?.role ?? null;
  const canViewOrganizationPatients =
    role === "provider" ||
    isPlatformAdmin(authData.user) ||
    membershipRole === "owner" ||
    membershipRole === "admin";

  if (!canViewOrganizationPatients) {
    return <AccessDenied message="Provider, owner, or admin role required to view patient history." />;
  }

  const canReadFullOrganizationData =
    isPlatformAdmin(authData.user) ||
    membershipRole === "owner" ||
    membershipRole === "admin";

  const patientQuery = supabase
    .from("patients")
    .select("id,user_id,first_name,last_name,date_of_birth,created_at,updated_at")
    .eq("id", patientId)
    .eq("organization_id", organizationId)
    .limit(1)
    .maybeSingle();

  if (!canReadFullOrganizationData) {
    const { count: linkedAppointmentCount } = await supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("patient_id", patientId)
      .eq("provider_id", authData.user.id);

    if (!linkedAppointmentCount) {
      return (
        <AccessDenied message="You can only view patient history for patients linked to your appointments." />
      );
    }
  }

  const { data: patientRow } = await patientQuery;

  if (!patientRow) {
    return (
      <Card className="border-slate-900/10 bg-white/75 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-cyan-950">Patient not found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          <p>We could not find this patient in your organization context.</p>
          <Link
            href="/provider/patients"
            className="inline-block text-cyan-900 underline underline-offset-4"
          >
            Back to patients dashboard
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

  let appointmentsQuery = supabase
    .from("appointments")
    .select("id,patient_id,provider_id,slot_id,starts_at,ends_at,status")
    .eq("organization_id", organizationId)
    .eq("patient_id", patientId)
    .order("starts_at", { ascending: false });

  let notesQuery = supabase
    .from("clinical_notes")
    .select(
      "id,encounter_id,patient_id,provider_id,note_type,content,version,created_at,updated_at",
    )
    .eq("organization_id", organizationId)
    .eq("patient_id", patientId)
    .order("updated_at", { ascending: false });

  if (!canReadFullOrganizationData) {
    appointmentsQuery = appointmentsQuery.eq("provider_id", authData.user.id);
    notesQuery = notesQuery.eq("provider_id", authData.user.id);
  }

  const [{ data: appointmentRows }, { data: noteRows }] = await Promise.all([
    appointmentsQuery,
    notesQuery,
  ]);

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

  const historyNotes = (noteRows ?? []).map((row) =>
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
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Patient History</p>
          <CardTitle className="text-cyan-950">
            {patient.firstName} {patient.lastName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700">
          <p>DOB: {new Date(patient.dateOfBirth).toLocaleDateString()}</p>
          <Link
            href="/provider/patients"
            className="inline-block text-cyan-900 underline underline-offset-4"
          >
            Back to patients dashboard
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
            <CardTitle className="text-cyan-950">Clinical Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            {historyNotes.length === 0 ? (
              <p>No clinical notes found for this patient.</p>
            ) : (
              <ul className="space-y-2">
                {historyNotes.map((note) => (
                  <li key={note.id} className="rounded-xl border border-slate-900/10 bg-white p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      {note.noteType} (v{note.version})
                    </p>
                    <p className="text-slate-800">{note.summary}</p>
                    <p className="text-xs text-slate-500">
                      Updated {new Date(note.updatedAt).toLocaleString()}
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
