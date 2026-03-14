import { ClinicalNoteForm } from "@/components/provider/clinical-note-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { clinicalNoteRecordSchema } from "@/lib/validations/clinical-note.schema";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Clinical Note | Health Stack",
};

export default async function ProviderClinicalNotePage({
  params,
}: {
  params: Promise<{ encounterId: string }>;
}) {
  const { encounterId } = await params;
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user || getUserRole(authData.user) !== "provider") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access denied</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Provider role required to manage clinical notes.
        </CardContent>
      </Card>
    );
  }

  const { data: encounter } = await supabase
    .from("encounters")
    .select("id")
    .eq("id", encounterId)
    .eq("provider_id", authData.user.id)
    .maybeSingle();

  if (!encounter) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Encounter unavailable</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          This encounter was not found or is not assigned to your account.
        </CardContent>
      </Card>
    );
  }

  const { data: noteRow } = await supabase
    .from("clinical_notes")
    .select(
      "id,encounter_id,patient_id,provider_id,note_type,content,version,created_at,updated_at",
    )
    .eq("encounter_id", encounterId)
    .maybeSingle();

  const note =
    noteRow === null
      ? null
      : clinicalNoteRecordSchema.parse({
          id: noteRow.id,
          encounterId: noteRow.encounter_id,
          patientId: noteRow.patient_id,
          providerId: noteRow.provider_id,
          noteType: noteRow.note_type,
          content: noteRow.content,
          version: noteRow.version,
          createdAt: noteRow.created_at,
          updatedAt: noteRow.updated_at,
        });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clinical Note</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Encounter: {encounterId}
        </p>
        {note ? (
          <p className="text-xs text-muted-foreground">
            Latest version: v{note.version} (updated{" "}
            {new Date(note.updatedAt).toLocaleString()})
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            No note saved yet for this encounter.
          </p>
        )}

        <ClinicalNoteForm
          encounterId={encounterId}
          initialNote={
            note
              ? {
                  id: note.id,
                  noteType: note.noteType,
                  content: note.content,
                  version: note.version,
                }
              : null
          }
        />
      </CardContent>
    </Card>
  );
}
