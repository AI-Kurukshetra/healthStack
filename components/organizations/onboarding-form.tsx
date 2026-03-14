"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  organizationOnboardingSchema,
  type OrganizationOnboardingInput,
} from "@/lib/validations/organization.schema";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

function toSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

type MutationResult = {
  data?: { nextPath?: string };
  error?: { code?: string; message?: string };
};

export function OrganizationOnboardingForm() {
  const router = useRouter();
  const [apiError, setApiError] = useState<string | null>(null);

  const form = useForm<OrganizationOnboardingInput>({
    resolver: zodResolver(organizationOnboardingSchema),
    defaultValues: {
      name: "",
      slug: "",
    },
  });

  const nameValue = form.watch("name");

  const handleSubmit = form.handleSubmit(async (values) => {
    setApiError(null);

    const response = await fetch("/api/organizations/onboarding", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(values),
    });

    const body = (await response.json()) as MutationResult;

    if (!response.ok) {
      setApiError(body.error?.message ?? "Unable to complete onboarding.");
      return;
    }

    router.push(body.data?.nextPath ?? "/dashboard");
    router.refresh();
  });

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-2">
        <Label htmlFor="org-name" className="text-slate-700">
          Organization name
        </Label>
        <Input
          id="org-name"
          placeholder="Acme Virtual Clinic"
          className="border-slate-900/15 bg-white"
          {...form.register("name", {
            onChange: (event) => {
              const generated = toSlug(String(event.target.value ?? ""));
              if (!form.getValues("slug")) {
                form.setValue("slug", generated, { shouldValidate: true });
              }
            },
          })}
        />
        {form.formState.errors.name?.message ? (
          <p className="text-xs text-red-500">{form.formState.errors.name.message}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="org-slug" className="text-slate-700">
          Workspace slug
        </Label>
        <Input
          id="org-slug"
          placeholder={toSlug(nameValue || "your-clinic")}
          className="border-slate-900/15 bg-white"
          {...form.register("slug")}
        />
        <p className="text-xs text-slate-500">
          Lowercase letters, numbers, hyphens. This identifies your tenant.
        </p>
        {form.formState.errors.slug?.message ? (
          <p className="text-xs text-red-500">{form.formState.errors.slug.message}</p>
        ) : null}
      </div>

      {apiError ? <p className="text-sm text-red-500">{apiError}</p> : null}

      <Button
        type="submit"
        className="w-full bg-cyan-900 text-white hover:bg-cyan-800"
        disabled={form.formState.isSubmitting}
      >
        {form.formState.isSubmitting ? "Creating workspace..." : "Complete onboarding"}
      </Button>
    </form>
  );
}
