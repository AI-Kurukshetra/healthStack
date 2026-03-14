import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isPlatformAdmin } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Organizations | Health Stack",
};

type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
};

type OrganizationSummary = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  membershipCount: number;
  patientCount: number;
  appointmentCount: number;
};

export default async function OrganizationsPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!isPlatformAdmin(authData.user)) {
    return (
      <Card className="border-slate-900/10 bg-white/75 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-cyan-950">Access denied</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-700">
          Admin role required to view all organizations.
        </CardContent>
      </Card>
    );
  }

  const adminClient = createAdminClient();
  const { data: organizations, error } = await adminClient
    .from("organizations")
    .select("id,name,slug,created_at")
    .order("created_at", { ascending: true });

  if (error) {
    return (
      <Card className="border-slate-900/10 bg-white/75 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-cyan-950">Organizations unavailable</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-700">
          Unable to load organizations right now.
        </CardContent>
      </Card>
    );
  }

  const summaries = await Promise.all(
    ((organizations ?? []) as OrganizationRow[]).map((organization) =>
      buildOrganizationSummary(adminClient, organization),
    ),
  );

  return (
    <div className="grid gap-4">
      <Card className="border-slate-900/10 bg-white/75 backdrop-blur-sm">
        <CardHeader className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Admin Workspace
          </p>
          <CardTitle className="text-cyan-950">All Organizations</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-slate-700 md:grid-cols-3">
          <div className="rounded-xl border border-slate-900/10 bg-white p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Organizations
            </p>
            <p className="mt-1 text-2xl font-semibold text-cyan-950">
              {summaries.length}
            </p>
          </div>
          <div className="rounded-xl border border-slate-900/10 bg-white p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Patients
            </p>
            <p className="mt-1 text-2xl font-semibold text-cyan-950">
              {summaries.reduce((count, organization) => count + organization.patientCount, 0)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-900/10 bg-white p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Appointments
            </p>
            <p className="mt-1 text-2xl font-semibold text-cyan-950">
              {summaries.reduce(
                (count, organization) => count + organization.appointmentCount,
                0,
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-900/10 bg-white/75 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-cyan-950">Organization Directory</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          {summaries.length === 0 ? (
            <p>No organizations found.</p>
          ) : (
            <ul className="space-y-2">
              {summaries.map((organization) => (
                <li
                  key={organization.id}
                  className="rounded-xl border border-slate-900/10 bg-white p-3"
                >
                  <p className="font-medium text-slate-950">{organization.name}</p>
                  <p className="text-xs text-slate-500">Slug: {organization.slug}</p>
                  <p className="text-xs text-slate-500">
                    Created: {new Date(organization.createdAt).toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    Members: {organization.membershipCount} | Patients:{" "}
                    {organization.patientCount} | Appointments:{" "}
                    {organization.appointmentCount}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

async function buildOrganizationSummary(
  adminClient: ReturnType<typeof createAdminClient>,
  organization: OrganizationRow,
): Promise<OrganizationSummary> {
  const [membershipCount, patientCount, appointmentCount] = await Promise.all([
    countByOrganization(adminClient, "organization_memberships", organization.id),
    countByOrganization(adminClient, "patients", organization.id),
    countByOrganization(adminClient, "appointments", organization.id),
  ]);

  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    createdAt: organization.created_at,
    membershipCount,
    patientCount,
    appointmentCount,
  };
}

async function countByOrganization(
  adminClient: ReturnType<typeof createAdminClient>,
  table: "organization_memberships" | "patients" | "appointments",
  organizationId: string,
): Promise<number> {
  const organizationColumn =
    table === "organization_memberships" ? "organization_id" : "organization_id";

  const { count } = await adminClient
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq(organizationColumn, organizationId);

  return count ?? 0;
}
