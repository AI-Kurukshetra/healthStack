import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { medicalRecordSummarySchema } from "@/lib/validations/medical-record.schema";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Patient Records | Health Stack",
};

export default async function PatientRecordsPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access denied</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Sign in to view your records.
        </CardContent>
      </Card>
    );
  }

  const { data: patient } = await supabase
    .from("patients")
    .select("id")
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (!patient) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Patient profile required</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record Summaries</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {summaries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No clinical notes are available yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {summaries.map((record) => (
              <li key={record.id} className="rounded-md border p-3 text-sm">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Encounter {record.encounterId}
                </p>
                <p className="font-medium capitalize text-foreground">
                  {record.noteType} note (v{record.version})
                </p>
                <p className="text-muted-foreground">{record.summary}</p>
                <p className="text-xs text-muted-foreground">
                  Updated {new Date(record.updatedAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
