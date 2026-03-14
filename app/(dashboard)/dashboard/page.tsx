import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | Health Stack",
};

export default function DashboardPage() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Provider Workspace</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Scheduling, consultation, and note-taking modules will be implemented
          in upcoming stories.
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Patient Workspace</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Onboarding, appointments, and records flows are scaffolded and ready
          for API/UI implementation.
        </CardContent>
      </Card>
    </div>
  );
}
