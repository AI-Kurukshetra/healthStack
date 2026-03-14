import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isPlatformAdmin } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "All Patients | Health Stack",
};

type PatientRow = {
  id: string;
  user_id: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  created_at: string;
};

type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
};

type AppointmentCountRow = {
  patient_id: string;
};

const PAGE_SIZE = 10;
const MAX_SEARCH_TOKENS = 3;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AdminPatientsSearchParams = {
  q?: string;
  page?: string;
};

export default async function AdminPatientsPage({
  searchParams,
}: {
  searchParams?: Promise<AdminPatientsSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const searchTerm = (resolvedSearchParams?.q ?? "").trim();
  const requestedPage = Number.parseInt(resolvedSearchParams?.page ?? "1", 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const startIndex = (page - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE - 1;

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!isPlatformAdmin(authData.user)) {
    return (
      <Card className="border-slate-900/10 bg-white/75 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-cyan-950">Access denied</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-700">
          Platform admin role required.
        </CardContent>
      </Card>
    );
  }

  const adminClient = createAdminClient();
  const searchTokens = tokenizeSearchTerm(searchTerm);
  let organizationIdsForSearch: string[] = [];

  if (searchTokens.length > 0) {
    let organizationSearchQuery = adminClient
      .from("organizations")
      .select("id")
      .limit(50);

    const orgSearchClauses: string[] = [];
    for (const token of searchTokens) {
      orgSearchClauses.push(`name.ilike.%${token}%`, `slug.ilike.%${token}%`);
    }

    organizationSearchQuery = organizationSearchQuery.or(orgSearchClauses.join(","));

    const { data: matchingOrganizations } = await organizationSearchQuery;
    organizationIdsForSearch = (matchingOrganizations ?? [])
      .map((organization) => organization.id)
      .filter((value): value is string => typeof value === "string");
  }

  let pagedPatientsQuery = adminClient
    .from("patients")
    .select(
      "id,user_id,organization_id,first_name,last_name,date_of_birth,created_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (searchTokens.length > 0) {
    const patientSearchClauses: string[] = [];
    for (const token of searchTokens) {
      const isUuidToken = uuidPattern.test(token);

      patientSearchClauses.push(`first_name.ilike.%${token}%`, `last_name.ilike.%${token}%`);

      if (isUuidToken) {
        patientSearchClauses.push(`id.eq.${token}`, `user_id.eq.${token}`);
      }
    }

    if (organizationIdsForSearch.length > 0) {
      patientSearchClauses.push(`organization_id.in.(${organizationIdsForSearch.join(",")})`);
    }

    pagedPatientsQuery = pagedPatientsQuery.or(patientSearchClauses.join(","));
  }

  const [
    { data: patientRows, count: filteredPatientCount },
    { count: totalPatientCount },
    { count: totalAppointmentCount },
    { count: totalOrganizationCount },
  ] = await Promise.all([
    pagedPatientsQuery.range(startIndex, endIndex),
    adminClient.from("patients").select("id", { count: "exact", head: true }),
    adminClient.from("appointments").select("id", { count: "exact", head: true }),
    adminClient.from("organizations").select("id", { count: "exact", head: true }),
  ]);

  const patients = (patientRows ?? []) as PatientRow[];
  const patientIds = patients.map((patient) => patient.id);
  const organizationIds = Array.from(new Set(patients.map((patient) => patient.organization_id)));

  const [{ data: organizationRows }, { data: appointmentRows }] = await Promise.all([
    organizationIds.length > 0
      ? adminClient.from("organizations").select("id,name,slug").in("id", organizationIds)
      : Promise.resolve({ data: [] as OrganizationRow[] }),
    patientIds.length > 0
      ? adminClient.from("appointments").select("patient_id").in("patient_id", patientIds)
      : Promise.resolve({ data: [] as AppointmentCountRow[] }),
  ]);

  const appointmentCountByPatientId = new Map<string, number>();
  ((appointmentRows ?? []) as AppointmentCountRow[]).forEach((appointment) => {
    appointmentCountByPatientId.set(
      appointment.patient_id,
      (appointmentCountByPatientId.get(appointment.patient_id) ?? 0) + 1,
    );
  });

  const organizationsById = new Map(
    ((organizationRows ?? []) as OrganizationRow[]).map((organization) => [
      organization.id,
      organization,
    ]),
  );
  const totalFilteredPatients = filteredPatientCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalFilteredPatients / PAGE_SIZE));
  const hasPreviousPage = page > 1;
  const hasNextPage = page < totalPages;
  const rangeStart = totalFilteredPatients === 0 ? 0 : startIndex + 1;
  const rangeEnd = totalFilteredPatients === 0 ? 0 : startIndex + patients.length;

  const buildPageHref = (nextPage: number) =>
    `/admin/patients?page=${nextPage}${searchTerm ? `&q=${encodeURIComponent(searchTerm)}` : ""}`;

  return (
    <div className="grid gap-4">
      <Card className="border-slate-900/10 bg-white/75 backdrop-blur-sm">
        <CardHeader className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Platform Admin
          </p>
          <CardTitle className="text-cyan-950">All Patients</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-slate-700 md:grid-cols-3">
          <div className="rounded-xl border border-slate-900/10 bg-white p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total Patients</p>
            <p className="mt-1 text-2xl font-semibold text-cyan-950">
              {totalPatientCount ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-slate-900/10 bg-white p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Organizations
            </p>
            <p className="mt-1 text-2xl font-semibold text-cyan-950">
              {totalOrganizationCount ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-slate-900/10 bg-white p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Total Appointments
            </p>
            <p className="mt-1 text-2xl font-semibold text-cyan-950">
              {totalAppointmentCount ?? 0}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-900/10 bg-white/75 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-cyan-950">Patient Directory</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          <form action="/admin/patients" method="get" className="flex gap-2">
            <input
              name="q"
              defaultValue={searchTerm}
              placeholder="Search by patient name, org name, patient ID, or user ID"
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none ring-cyan-500 transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2"
            />
            <button
              type="submit"
              className="rounded-lg bg-cyan-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-800"
            >
              Search
            </button>
          </form>
          <p className="text-xs text-slate-500">
            Showing {rangeStart}-{rangeEnd} of {totalFilteredPatients}
            {searchTerm ? ` for "${searchTerm}"` : ""}.
          </p>

          {patients.length === 0 ? (
            <p>No patients found.</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-900/10 bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-xs uppercase tracking-wide text-slate-600">
                      <th className="px-4 py-3 font-semibold">Patient</th>
                      <th className="px-4 py-3 font-semibold">DOB</th>
                      <th className="px-4 py-3 font-semibold">Organization</th>
                      <th className="px-4 py-3 font-semibold">Appointments</th>
                      <th className="px-4 py-3 font-semibold">Created</th>
                      <th className="px-4 py-3 font-semibold">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {patients.map((patient) => {
                      const organization = organizationsById.get(patient.organization_id);

                      return (
                        <tr key={patient.id} className="align-top text-slate-700 hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-950">
                              {patient.first_name} {patient.last_name}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {new Date(patient.date_of_birth).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-800">
                              {organization?.name ?? "Unknown"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {organization?.slug ?? "n/a"}
                            </p>
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {appointmentCountByPatientId.get(patient.id) ?? 0}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {new Date(patient.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/admin/patients/${patient.id}`}
                              className="inline-flex rounded-md bg-cyan-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-cyan-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2"
                            >
                              Open
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-slate-200 pt-3">
            {hasPreviousPage ? (
              <Link
                href={buildPageHref(page - 1)}
                className="rounded-md px-3 py-1 text-sm text-cyan-900 underline underline-offset-4"
              >
                Previous
              </Link>
            ) : (
              <span className="cursor-not-allowed rounded-md px-3 py-1 text-sm text-slate-400">
                Previous
              </span>
            )}
            <p className="text-xs text-slate-500">
              Page {Math.min(page, totalPages)} of {totalPages}
            </p>
            {hasNextPage ? (
              <Link
                href={buildPageHref(page + 1)}
                className="rounded-md px-3 py-1 text-sm text-cyan-900 underline underline-offset-4"
              >
                Next
              </Link>
            ) : (
              <span className="cursor-not-allowed rounded-md px-3 py-1 text-sm text-slate-400">
                Next
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function tokenizeSearchTerm(value: string): string[] {
  return value
    .trim()
    .split(/\s+/)
    .map((token) => token.replace(/[^a-zA-Z0-9@._-]/g, ""))
    .filter((token) => token.length > 0)
    .slice(0, MAX_SEARCH_TOKENS);
}
