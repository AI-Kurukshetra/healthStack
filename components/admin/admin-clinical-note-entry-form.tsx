"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type EncounterOption = {
  id: string;
  label: string;
  hasNote: boolean;
};

type AdminClinicalNoteEntryFormProps = {
  encounterOptions: EncounterOption[];
};

type MutationResponse = {
  error?: {
    code?: string;
    message?: string;
  };
};

export function AdminClinicalNoteEntryForm({
  encounterOptions,
}: AdminClinicalNoteEntryFormProps) {
  const router = useRouter();
  const [encounterId, setEncounterId] = useState("");
  const [noteType, setNoteType] = useState<"soap" | "progress">("soap");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const availableOptions = useMemo(
    () => encounterOptions.filter((option) => !option.hasNote),
    [encounterOptions],
  );
  const canCreateNote = availableOptions.length > 0;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!encounterId || content.trim().length === 0) {
      setError("Encounter and note content are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/medical-records", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action: "create",
          encounterId,
          noteType,
          content,
        }),
      });

      const body = (await response.json()) as MutationResponse;

      if (!response.ok) {
        setError(body.error?.message ?? "Unable to save clinical note.");
        return;
      }

      setMessage("Clinical note saved.");
      setEncounterId("");
      setContent("");
      router.refresh();
    } catch {
      setError("Unable to save clinical note.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      {!canCreateNote ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          No eligible encounters without notes were found for this patient.
        </p>
      ) : null}

      <div className="grid gap-2">
        <label htmlFor="encounter-id" className="text-sm font-medium text-slate-700">
          Encounter
        </label>
        <select
          id="encounter-id"
          value={encounterId}
          onChange={(event) => setEncounterId(event.target.value)}
          className="h-10 rounded-md border border-slate-900/15 bg-white px-3 text-sm"
          disabled={!canCreateNote || isSubmitting}
        >
          <option value="">Select encounter</option>
          {availableOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        <label htmlFor="note-type" className="text-sm font-medium text-slate-700">
          Note type
        </label>
        <select
          id="note-type"
          value={noteType}
          onChange={(event) => setNoteType(event.target.value as "soap" | "progress")}
          className="h-10 rounded-md border border-slate-900/15 bg-white px-3 text-sm"
          disabled={!canCreateNote || isSubmitting}
        >
          <option value="soap">SOAP</option>
          <option value="progress">Progress</option>
        </select>
      </div>

      <div className="grid gap-2">
        <label htmlFor="note-content" className="text-sm font-medium text-slate-700">
          Clinical note
        </label>
        <textarea
          id="note-content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={6}
          className="w-full rounded-md border border-slate-900/15 bg-white px-3 py-2 text-sm"
          placeholder="Enter clinical note details..."
          disabled={!canCreateNote || isSubmitting}
        />
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

      <Button
        type="submit"
        className="bg-cyan-900 text-white hover:bg-cyan-800"
        disabled={!canCreateNote || isSubmitting}
      >
        {isSubmitting ? "Saving..." : "Save clinical note"}
      </Button>
    </form>
  );
}
