"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

export function PrescriptionUploadForm() {
  const router = useRouter();
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setApiError(null);
    setSuccessMessage(null);

    const form = event.currentTarget;
    const input = form.elements.namedItem("file") as HTMLInputElement | null;
    const file = input?.files?.[0];

    if (!file) {
      setApiError("Please select a prescription file.");
      return;
    }

    setIsSubmitting(true);

    try {
      const body = new FormData();
      body.set("file", file);

      const response = await fetch("/api/prescriptions", {
        method: "POST",
        body,
      });

      const payload = (await response.json()) as {
        message?: string;
        error?: { message?: string };
      };

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Unable to upload prescription.");
      }

      setSuccessMessage(payload.message ?? "Prescription uploaded.");
      setResetKey((value) => value + 1);
      router.refresh();
    } catch (error: unknown) {
      setApiError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid gap-2">
        <Label htmlFor="prescription-file" className="text-slate-700">
          Upload file
        </Label>
        <Input
          key={resetKey}
          id="prescription-file"
          name="file"
          type="file"
          accept=".pdf,image/jpeg,image/png"
          className="border-slate-900/15 bg-white file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-cyan-900 file:px-3 file:py-1 file:text-white"
          disabled={isSubmitting}
        />
        <p className="text-xs text-slate-500">Accepted: PDF, JPG, PNG (max 5 MB)</p>
      </div>

      {apiError ? <p className="text-sm text-red-500">{apiError}</p> : null}
      {successMessage ? <p className="text-sm text-emerald-600">{successMessage}</p> : null}

      <Button
        type="submit"
        className="bg-cyan-900 text-white hover:bg-cyan-800"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Uploading..." : "Upload Prescription"}
      </Button>
    </form>
  );
}
