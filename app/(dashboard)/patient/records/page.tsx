import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PrescriptionUploadForm } from "@/components/patients/prescription-upload-form";
import { getUserRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { medicalRecordSummarySchema } from "@/lib/validations/medical-record.schema";
import { prescriptionRecordSchema } from "@/lib/validations/prescription.schema";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Patient Records | Health Stack",
};

export default async function PatientRecordsPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const role = getUserRole(authData.user);

  if (!authData.user || role !== "patient") {
    return (
      <Card className="border-slate-900/10 bg-white/75 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-cyan-950">Access denied</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-700">
          Patient role required to view records.
        </CardContent>
      </Card>
    );
  }

  const { data: patient } = await supabase
    .from("patients")
    .select("id,organization_id")
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (!patient) {
    return (
      <Card className="border-slate-900/10 bg-white/75 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-cyan-950">Patient profile required</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-700">
          Complete your intake profile to access record summaries.
        </CardContent>
      </Card>
    );
  }

  const { data: rows } = await supabase
    .from("clinical_notes")
    .select(
      "id,encounter_id,patient_id,provider_id,note_type,content,version,created_at,updated_at",
    )
    .eq("patient_id", patient.id)
    .order("updated_at", { ascending: false });

  const summaries = (rows ?? []).map((row) =>
    medicalRecordSummarySchema.parse({
      id: row.id,
      encounterId: row.encounter_id,
      patientId: row.patient_id,
      providerId: row.provider_id,
      noteType: row.note_type,
      summary:
        row.content.length <= 180
          ? row.content
          : `${row.content.slice(0, 177)}...`,
      version: row.version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }),
  );

  const { data: prescriptionRows } = await supabase
    .from("patient_prescriptions")
    .select("id,organization_id,patient_id,uploaded_by,file_name,file_path,mime_type,size_bytes,created_at")
    .eq("patient_id", patient.id)
    .eq("organization_id", patient.organization_id)
    .order("created_at", { ascending: false });

  const prescriptions = await Promise.all(
    (prescriptionRows ?? []).map(async (row) => {
      const { data: signedUrlData } = await supabase.storage
        .from("patient-prescriptions")
        .createSignedUrl(row.file_path, 60 * 60);

      return prescriptionRecordSchema.parse({
        id: row.id,
        organizationId: row.organization_id,
        patientId: row.patient_id,
        uploadedBy: row.uploaded_by,
        fileName: row.file_name,
        filePath: row.file_path,
        mimeType: row.mime_type,
        sizeBytes: row.size_bytes,
        createdAt: row.created_at,
        downloadUrl: signedUrlData?.signedUrl ?? null,
      });
    }),
  );

  return (
    <div className="grid gap-4">
      <Card className="border-slate-900/10 bg-white/75 backdrop-blur-sm">
        <CardHeader className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Patient Workflow
          </p>
          <CardTitle className="text-cyan-950">Record Summaries</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-slate-700 md:grid-cols-3">
          <div className="rounded-xl border border-slate-900/10 bg-white p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total notes</p>
            <p className="mt-1 text-2xl font-semibold text-cyan-950">{summaries.length}</p>
          </div>
          <div className="rounded-xl border border-slate-900/10 bg-white p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Latest update</p>
            <p className="mt-1 text-xs">
              {summaries[0]
                ? new Date(summaries[0].updatedAt).toLocaleString()
                : "No notes yet"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-900/10 bg-white p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
            <p className="mt-1 text-xs">
              {summaries.length > 0
                ? "Summaries available for review."
                : "Waiting for provider documentation."}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-900/10 bg-white/75 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-cyan-950">Clinical History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {summaries.length === 0 ? (
            <p className="text-sm text-slate-700">No clinical notes are available yet.</p>
          ) : (
            <ul className="space-y-2">
              {summaries.map((record) => (
                <li
                  key={record.id}
                  className="rounded-xl border border-slate-900/10 bg-white p-3 text-sm"
                >
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Clinical encounter
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

      <Card className="border-slate-900/10 bg-white/75 backdrop-blur-sm">
        <CardHeader className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Patient Workflow
          </p>
          <CardTitle className="text-cyan-950">Prescriptions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <PrescriptionUploadForm />
          {prescriptions.length === 0 ? (
            <p className="text-sm text-slate-700">No prescriptions uploaded yet.</p>
          ) : (
            <ul className="space-y-2">
              {prescriptions.map((prescription) => (
                <li
                  key={prescription.id}
                  className="rounded-xl border border-slate-900/10 bg-white p-3 text-sm"
                >
                  <p className="font-medium text-slate-950">{prescription.fileName}</p>
                  <p className="text-xs text-slate-500">
                    {Math.max(1, Math.round(prescription.sizeBytes / 1024))} KB ·{" "}
                    {new Date(prescription.createdAt).toLocaleString()}
                  </p>
                  {prescription.downloadUrl ? (
                    <a
                      href={prescription.downloadUrl}
                      className="mt-2 inline-block text-xs font-medium text-cyan-900 hover:text-cyan-700"
                    >
                      Download
                    </a>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">
                      Download link unavailable. Refresh and try again.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
