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
      <Card className="border-slate-900/10 bg-white/75 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-cyan-950">Access denied</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-700">
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
      <Card className="border-slate-900/10 bg-white/75 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-cyan-950">Encounter unavailable</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-700">
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
    <div className="grid gap-4">
      <Card className="border-slate-900/10 bg-white/75 backdrop-blur-sm">
        <CardHeader className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Provider Workflow
          </p>
          <CardTitle className="text-cyan-950">Clinical Note</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-slate-700 md:grid-cols-3">
          <div className="rounded-xl border border-slate-900/10 bg-white p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Encounter</p>
            <p className="mt-1 font-mono text-xs text-slate-900">{encounterId}</p>
          </div>
          <div className="rounded-xl border border-slate-900/10 bg-white p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Version</p>
            <p className="mt-1 text-2xl font-semibold text-cyan-950">
              v{note?.version ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-slate-900/10 bg-white p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Last update</p>
            <p className="mt-1 text-xs">
              {note
                ? new Date(note.updatedAt).toLocaleString()
                : "No note saved yet for this encounter."}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-900/10 bg-white/75 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-cyan-950">Documentation Editor</CardTitle>
        </CardHeader>
        <CardContent>
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
    </div>
  );
}
