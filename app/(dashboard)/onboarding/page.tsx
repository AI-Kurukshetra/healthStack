import { OrganizationOnboardingForm } from "@/components/organizations/onboarding-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Organization Onboarding | Health Stack",
};

export default function OrganizationOnboardingPage() {
  return (
    <div className="grid gap-4">
      <Card className="border-slate-900/10 bg-white/75 backdrop-blur-sm">
        <CardHeader className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Multi-tenant Setup
          </p>
          <CardTitle className="text-cyan-950">Create your organization workspace</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-700">
          <p>
            Before using dashboard modules, create your organization. Your user
            will be assigned as workspace owner.
          </p>
          <OrganizationOnboardingForm />
        </CardContent>
      </Card>
    </div>
  );
}
