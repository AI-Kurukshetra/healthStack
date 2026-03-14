import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Awaiting Organization Assignment | Health Stack",
};

export default function AwaitingOrganizationAssignmentPage() {
  return (
    <div className="grid gap-4">
      <Card className="border-slate-900/10 bg-white/75 backdrop-blur-sm">
        <CardHeader className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Provider Access</p>
          <CardTitle className="text-cyan-950">Awaiting organization assignment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          <p>
            Your provider account is active, but it is not linked to an organization yet.
          </p>
          <p>
            Contact your organization owner/admin or platform admin to assign your account to an
            organization.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
