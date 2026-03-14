import { PatientProfileForm } from "@/components/patients/patient-profile-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { patientRecordSchema } from "@/lib/validations/patient.schema";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | Health Stack",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  let initialProfile = null;

  if (authData.user) {
    const { data } = await supabase
      .from("patients")
      .select("id,user_id,first_name,last_name,date_of_birth,created_at,updated_at")
      .eq("user_id", authData.user.id)
      .maybeSingle();

    if (data) {
      initialProfile = patientRecordSchema.parse({
        id: data.id,
        userId: data.user_id,
        firstName: data.first_name,
        lastName: data.last_name,
        dateOfBirth: data.date_of_birth,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      });
    }
  }

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
          <CardTitle>Patient Intake</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <PatientProfileForm initialProfile={initialProfile} />
        </CardContent>
      </Card>
    </div>
  );
}
