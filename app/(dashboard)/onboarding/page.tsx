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
          <CardTitle className="text-cyan-950">Organization setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-700">
          <p>
            This setup is available only to owner/admin roles and platform admins.
            If your account is a provider without an organization assignment,
            contact your admin.
          </p>
          <OrganizationOnboardingForm />
        </CardContent>
      </Card>
    </div>
  );
}
