"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  clinicalNoteDraftSchema,
  type ClinicalNoteDraftInput,
} from "@/lib/validations/clinical-note.schema";

type ClinicalNoteFormProps = {
  encounterId: string;
  initialNote: {
    id: string;
    noteType: "soap" | "progress";
    content: string;
    version: number;
  } | null;
};

type MutationResponse = {
  data?: {
    id: string;
    version: number;
  };
  error?: {
    code: string;
    message: string;
  };
};

export function ClinicalNoteForm({
  encounterId,
  initialNote,
}: ClinicalNoteFormProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ClinicalNoteDraftInput>({
    resolver: zodResolver(clinicalNoteDraftSchema),
    defaultValues: {
      noteType: initialNote?.noteType ?? "soap",
      content: initialNote?.content ?? "",
    },
  });

  async function onSubmit(values: ClinicalNoteDraftInput) {
    setMessage(null);
    setError(null);

    const payload = initialNote
      ? {
          action: "update",
          noteId: initialNote.id,
          noteType: values.noteType,
          content: values.content,
        }
      : {
          action: "create",
          encounterId,
          noteType: values.noteType,
          content: values.content,
        };

    const response = await fetch("/api/medical-records", {
      method: initialNote ? "PATCH" : "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const body = (await response.json()) as MutationResponse;

    if (!response.ok) {
      setError(body.error?.message ?? "Unable to save note.");
      return;
    }

    setMessage(
      initialNote
        ? `Clinical note updated (v${body.data?.version ?? "-"}).`
        : "Clinical note saved.",
    );
  }

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="space-y-2">
        <Label htmlFor="noteType">Note type</Label>
        <Input
          id="noteType"
          list="clinical-note-types"
          {...form.register("noteType")}
        />
        <datalist id="clinical-note-types">
          <option value="soap" />
          <option value="progress" />
        </datalist>
        {form.formState.errors.noteType ? (
          <p className="text-xs text-destructive">
            {form.formState.errors.noteType.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Clinical note</Label>
        <textarea
          id="content"
          className="min-h-40 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          {...form.register("content")}
        />
        {form.formState.errors.content ? (
          <p className="text-xs text-destructive">
            {form.formState.errors.content.message}
          </p>
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting
          ? "Saving..."
          : initialNote
            ? "Update note"
            : "Save note"}
      </Button>
    </form>
  );
}
