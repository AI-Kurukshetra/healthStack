import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ASSIGN_ORG_SLUG = process.env.ASSIGN_ORG_SLUG ?? "bacancy-health-network";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const allowedRoles = new Set(["owner", "admin", "provider", "patient", "staff"]);

function normalizeMembershipRole(role) {
  if (typeof role === "string" && allowedRoles.has(role)) {
    return role;
  }

  if (role === "unknown" || role === "super_admin") {
    return "admin";
  }

  return "patient";
}

async function getAllUsers() {
  const allUsers = [];
  const perPage = 200;
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });

    if (error) {
      throw new Error(`Failed to list users: ${error.message}`);
    }

    const users = data?.users ?? [];
    if (users.length === 0) {
      break;
    }

    allUsers.push(...users);
    if (users.length < perPage) {
      break;
    }
    page += 1;
  }

  return allUsers;
}

async function resolveOrganization() {
  const bySlug = await supabase
    .from("organizations")
    .select("id,slug,name")
    .eq("slug", ASSIGN_ORG_SLUG)
    .maybeSingle();

  if (bySlug.error) {
    throw new Error(`Failed to query organization by slug: ${bySlug.error.message}`);
  }

  if (bySlug.data) {
    return bySlug.data;
  }

  const fallback = await supabase
    .from("organizations")
    .select("id,slug,name")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fallback.error) {
    throw new Error(`Failed to query fallback organization: ${fallback.error.message}`);
  }

  if (!fallback.data) {
    throw new Error(
      `No organizations found. Create one first or set ASSIGN_ORG_SLUG to an existing slug.`,
    );
  }

  return fallback.data;
}

async function assignMemberships(organizationId, users) {
  const membershipRows = users.map((user) => ({
    organization_id: organizationId,
    user_id: user.id,
    role: normalizeMembershipRole(user.user_metadata?.role),
  }));

  const { error } = await supabase
    .from("organization_memberships")
    .upsert(membershipRows, { onConflict: "organization_id,user_id" });

  if (error) {
    throw new Error(`Failed to upsert organization memberships: ${error.message}`);
  }

  return membershipRows.length;
}

async function assignPatients(organizationId) {
  const { data: patients, error: readError } = await supabase
    .from("patients")
    .select("id");

  if (readError) {
    throw new Error(`Failed to read patients: ${readError.message}`);
  }

  const totalPatients = (patients ?? []).length;
  if (totalPatients === 0) {
    return { totalPatients: 0, updatedPatients: 0 };
  }

  const { error: updateError } = await supabase
    .from("patients")
    .update({ organization_id: organizationId })
    .not("id", "is", null);

  if (updateError) {
    throw new Error(`Failed to update patients organization_id: ${updateError.message}`);
  }

  return { totalPatients, updatedPatients: totalPatients };
}

async function main() {
  const organization = await resolveOrganization();
  const users = await getAllUsers();
  const assignedMemberships = await assignMemberships(organization.id, users);
  const patientAssignment = await assignPatients(organization.id);

  console.log(
    JSON.stringify(
      {
        organization: {
          id: organization.id,
          slug: organization.slug,
          name: organization.name,
        },
        usersTotal: users.length,
        membershipsAssigned: assignedMemberships,
        patientsTotal: patientAssignment.totalPatients,
        patientsUpdated: patientAssignment.updatedPatients,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
