import { PatientProfileForm } from "@/components/patients/patient-profile-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { patientRecordSchema } from "@/lib/validations/patient.schema";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Dashboard | Health Stack",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const role = getUserRole(authData.user);
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
    <div className="grid gap-4">
      <Card className="border-slate-900/10 bg-white/75 backdrop-blur-sm">
        <CardHeader className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Dashboard
          </p>
          <CardTitle className="text-2xl text-cyan-950">Care Workflow Hub</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
          <Link
            className="rounded-xl border border-slate-900/10 bg-white p-3 transition hover:-translate-y-0.5 hover:border-cyan-900/35"
            href="/patient/appointments"
          >
            <p className="font-medium text-slate-950">Appointments</p>
            <p className="text-slate-600">Book, track, and join consultations.</p>
          </Link>
          <Link
            className="rounded-xl border border-slate-900/10 bg-white p-3 transition hover:-translate-y-0.5 hover:border-cyan-900/35"
            href="/patient/records"
          >
            <p className="font-medium text-slate-950">Patient Records</p>
            <p className="text-slate-600">View clinical note summaries and history.</p>
          </Link>
          {role === "provider" ? (
            <Link
              className="rounded-xl border border-slate-900/10 bg-white p-3 transition hover:-translate-y-0.5 hover:border-cyan-900/35"
              href="/provider"
            >
              <p className="font-medium text-slate-950">Provider Queue</p>
              <p className="text-slate-600">
                Review upcoming visits and launch encounter actions.
              </p>
            </Link>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-900/25 bg-white p-3">
              <p className="font-medium text-slate-950">Provider Queue</p>
              <p className="text-slate-600">Available for provider role accounts.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-slate-900/10 bg-white/75 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-cyan-950">Provider Workspace</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700">
            Providers can use the queue to manage upcoming appointments, open
            encounter sessions, and continue into clinical notes.
          </CardContent>
        </Card>
        <Card className="border-slate-900/10 bg-white/75 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-cyan-950">Patient Intake</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <PatientProfileForm initialProfile={initialProfile} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
