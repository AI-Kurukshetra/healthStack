import { PatientProfileForm } from "@/components/patients/patient-profile-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserRole, isPlatformAdmin } from "@/lib/auth/roles";
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
  const isAdmin = isPlatformAdmin(authData.user);
  let initialProfile = null;

  if (authData.user && role === "patient") {
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
          {role === "patient" ? (
            <div className="grid gap-2">
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
                <p className="text-slate-600">
                  View clinical note summaries and history.
                </p>
              </Link>
            </div>
          ) : null}
          {role === "provider" ? (
            <div className="grid gap-2">
              <Link
                className="rounded-xl border border-slate-900/10 bg-white p-3 transition hover:-translate-y-0.5 hover:border-cyan-900/35"
                href="/provider"
              >
                <p className="font-medium text-slate-950">Provider Queue</p>
                <p className="text-slate-600">
                  Review upcoming visits and launch encounter actions.
                </p>
              </Link>
              <Link
                className="rounded-xl border border-slate-900/10 bg-white p-3 transition hover:-translate-y-0.5 hover:border-cyan-900/35"
                href="/provider/patients"
              >
                <p className="font-medium text-slate-950">Patients Dashboard</p>
                <p className="text-slate-600">
                  View organization patient data, appointments, and history.
                </p>
              </Link>
            </div>
          ) : null}
          {isAdmin ? (
            <div className="grid gap-2">
              <Link
                className="rounded-xl border border-slate-900/10 bg-white p-3 transition hover:-translate-y-0.5 hover:border-cyan-900/35"
                href="/admin/patients"
              >
                <p className="font-medium text-slate-950">All Patients</p>
                <p className="text-slate-600">
                  Review every patient across all organizations.
                </p>
              </Link>
              <Link
                className="rounded-xl border border-slate-900/10 bg-white p-3 transition hover:-translate-y-0.5 hover:border-cyan-900/35"
                href="/organizations"
              >
                <p className="font-medium text-slate-950">Organizations</p>
                <p className="text-slate-600">
                  Review all organizations and top-level operational counts.
                </p>
              </Link>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-900/25 bg-white p-3">
              <p className="font-medium text-slate-950">Organization Access</p>
              <p className="text-slate-600">
                Admin role unlocks cross-organization visibility.
              </p>
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
            {role === "patient" ? (
              initialProfile ? (
                <div className="space-y-2 text-slate-700">
                  <p className="font-medium text-slate-950">Profile on file</p>
                  <p>
                    Intake profile is already completed for{" "}
                    {initialProfile.firstName} {initialProfile.lastName}.
                  </p>
                  <p className="text-xs text-slate-500">
                    DOB: {new Date(initialProfile.dateOfBirth).toLocaleDateString()}
                  </p>
                </div>
              ) : (
                <PatientProfileForm initialProfile={initialProfile} />
              )
            ) : (
              <p className="text-slate-700">
                Patient intake form is only available for patient accounts.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
