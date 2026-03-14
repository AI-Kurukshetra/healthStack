"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { savePatientProfile } from "@/lib/api/patients-client";
import {
  patientProfilePayloadSchema,
  type PatientRecord,
} from "@/lib/validations/patient.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

type PatientProfileFormInput = z.infer<typeof patientProfilePayloadSchema>;

export function PatientProfileForm({
  initialProfile,
}: {
  initialProfile: PatientRecord | null;
}) {
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const router = useRouter();

  const form = useForm<PatientProfileFormInput>({
    resolver: zodResolver(patientProfilePayloadSchema),
    defaultValues: {
      firstName: initialProfile?.firstName ?? "",
      lastName: initialProfile?.lastName ?? "",
      dateOfBirth: initialProfile?.dateOfBirth ?? "",
    },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    setApiError(null);
    setSuccessMessage(null);

    try {
      await savePatientProfile(values);
      setSuccessMessage("Patient intake saved.");
      router.refresh();
    } catch (error: unknown) {
      setApiError(error instanceof Error ? error.message : "Failed to save profile");
    }
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="first-name">First Name</Label>
        <Input id="first-name" {...form.register("firstName")} />
        {form.formState.errors.firstName?.message ? (
          <p className="text-sm text-red-500">
            {form.formState.errors.firstName.message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="last-name">Last Name</Label>
        <Input id="last-name" {...form.register("lastName")} />
        {form.formState.errors.lastName?.message ? (
          <p className="text-sm text-red-500">
            {form.formState.errors.lastName.message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="date-of-birth">Date of Birth</Label>
        <Input id="date-of-birth" type="date" {...form.register("dateOfBirth")} />
        {form.formState.errors.dateOfBirth?.message ? (
          <p className="text-sm text-red-500">
            {form.formState.errors.dateOfBirth.message}
          </p>
        ) : null}
      </div>

      {apiError ? <p className="text-sm text-red-500">{apiError}</p> : null}
      {successMessage ? (
        <p className="text-sm text-emerald-600">{successMessage}</p>
      ) : null}

      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Saving..." : "Save Profile"}
      </Button>
    </form>
  );
}
