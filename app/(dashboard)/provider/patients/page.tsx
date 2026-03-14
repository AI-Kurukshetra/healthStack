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
  title: "Provider Patients Dashboard | Health Stack",
};

export default async function ProviderPatientsDashboardPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const role = getUserRole(authData.user);
  const organizationId = await getCurrentOrganizationId();

  if (!authData.user || !organizationId) {
    return (
      <Card className="border-slate-900/10 bg-white/75 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-cyan-950">Access denied</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-700">
          Organization context is required to view this dashboard.
        </CardContent>
      </Card>
    );
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
    return (
      <Card className="border-slate-900/10 bg-white/75 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-cyan-950">Access denied</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-700">
          Provider, owner, or admin role required to view patient dashboards.
        </CardContent>
      </Card>
    );
  }

  const canReadFullOrganizationData =
    isPlatformAdmin(authData.user) ||
    membershipRole === "owner" ||
    membershipRole === "admin";

  let appointmentQuery = supabase
    .from("appointments")
    .select("id,patient_id,provider_id,slot_id,starts_at,ends_at,status")
    .eq("organization_id", organizationId)
    .order("starts_at", { ascending: false });

  if (!canReadFullOrganizationData) {
    appointmentQuery = appointmentQuery.eq("provider_id", authData.user.id);
  }

  const { data: appointmentRows } = await appointmentQuery;

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

  const patientIds = Array.from(
    new Set(appointments.map((appointment) => appointment.patientId)),
  );
  let patientRows:
    | Array<{
        id: string;
        user_id: string;
        first_name: string;
        last_name: string;
        date_of_birth: string;
        created_at: string;
        updated_at: string;
      }>
    | null = [];

  if (canReadFullOrganizationData) {
    const result = await supabase
      .from("patients")
      .select("id,user_id,first_name,last_name,date_of_birth,created_at,updated_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });
    patientRows = result.data;
  } else if (patientIds.length > 0) {
    const result = await supabase
      .from("patients")
      .select("id,user_id,first_name,last_name,date_of_birth,created_at,updated_at")
      .in("id", patientIds)
      .order("created_at", { ascending: false });
    patientRows = result.data;
  }

  const patients = (patientRows ?? []).map((row) =>
    patientRecordSchema.parse({
      id: row.id,
      userId: row.user_id,
      firstName: row.first_name,
      lastName: row.last_name,
      dateOfBirth: row.date_of_birth,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }),
  );

  let noteQuery = supabase
    .from("clinical_notes")
    .select(
      "id,encounter_id,patient_id,provider_id,note_type,content,version,created_at,updated_at",
    )
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false })
    .limit(25);

  if (!canReadFullOrganizationData) {
    noteQuery = noteQuery.eq("provider_id", authData.user.id);
  }

  const { data: noteRows } = await noteQuery;

  const patientHistory = (noteRows ?? []).map((row) =>
    medicalRecordSummarySchema.parse({
      id: row.id,
      encounterId: row.encounter_id,
      patientId: row.patient_id,
      providerId: row.provider_id,
      noteType: row.note_type,
      summary: row.content.length <= 180 ? row.content : `${row.content.slice(0, 177)}...`,
      version: row.version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }),
  );

  const appointmentCountByPatientId = new Map<string, number>();
  appointments.forEach((appointment) => {
    appointmentCountByPatientId.set(
      appointment.patientId,
      (appointmentCountByPatientId.get(appointment.patientId) ?? 0) + 1,
    );
  });

  return (
    <div className="grid gap-4">
      <Card className="border-slate-900/10 bg-white/75 backdrop-blur-sm">
        <CardHeader className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Provider Dashboard
          </p>
          <CardTitle className="text-cyan-950">Patients, Appointments, History</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-slate-700 md:grid-cols-3">
          <div className="rounded-xl border border-slate-900/10 bg-white p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Patients</p>
            <p className="mt-1 text-2xl font-semibold text-cyan-950">{patients.length}</p>
          </div>
          <div className="rounded-xl border border-slate-900/10 bg-white p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Appointments</p>
            <p className="mt-1 text-2xl font-semibold text-cyan-950">
              {appointments.length}
            </p>
          </div>
          <div className="rounded-xl border border-slate-900/10 bg-white p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">History notes</p>
            <p className="mt-1 text-2xl font-semibold text-cyan-950">
              {patientHistory.length}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-slate-900/10 bg-white/75 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-cyan-950">Patients</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            {patients.length === 0 ? (
              <p>No patients linked to your appointments yet.</p>
            ) : (
              <ul className="space-y-2">
                {patients.map((patient) => (
                  <li
                    key={patient.id}
                    className="rounded-xl border border-slate-900/10 bg-white p-3"
                  >
                    <p className="font-medium text-slate-950">
                      {patient.firstName} {patient.lastName}
                    </p>
                    <p className="text-xs text-slate-500">
                      DOB: {new Date(patient.dateOfBirth).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-slate-500">
                      Visits: {appointmentCountByPatientId.get(patient.id) ?? 0}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-900/10 bg-white/75 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-cyan-950">Appointments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            {appointments.length === 0 ? (
              <p>No appointments yet.</p>
            ) : (
              <ul className="space-y-2">
                {appointments.slice(0, 20).map((appointment) => (
                  <li
                    key={appointment.id}
                    className="rounded-xl border border-slate-900/10 bg-white p-3"
                  >
                    <p className="font-medium text-slate-950">
                      Patient ID: {appointment.patientId}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(appointment.startsAt).toLocaleString()} -{" "}
                      {new Date(appointment.endsAt).toLocaleString()}
                    </p>
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Status: {appointment.status}
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
            <Link
              href="/provider"
              className="inline-block text-xs text-cyan-900 underline underline-offset-4"
            >
              Back to provider queue
            </Link>
            {patientHistory.length === 0 ? (
              <p>No clinical notes saved yet.</p>
            ) : (
              <ul className="space-y-2">
                {patientHistory.map((record) => (
                  <li
                    key={record.id}
                    className="rounded-xl border border-slate-900/10 bg-white p-3"
                  >
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Patient {record.patientId}
                    </p>
                    <p className="font-medium capitalize text-slate-950">
                      {record.noteType} note (v{record.version})
                    </p>
                    <p className="text-slate-700">{record.summary}</p>
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
