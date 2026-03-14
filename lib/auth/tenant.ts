import { createClient } from "@/lib/supabase/server";

export type OrganizationMembership = {
  organizationId: string;
  role: "owner" | "admin" | "provider" | "patient" | "staff";
};

const allowedMembershipRoles = new Set<OrganizationMembership["role"]>([
  "owner",
  "admin",
  "provider",
  "patient",
  "staff",
]);

export async function getOrganizationMembershipsForCurrentUser(): Promise<
  OrganizationMembership[]
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data } = await supabase
    .from("organization_memberships")
    .select("organization_id,role")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  return (data ?? [])
    .filter((row): row is { organization_id: string; role: OrganizationMembership["role"] } =>
      allowedMembershipRoles.has(row.role as OrganizationMembership["role"]),
    )
    .map((row) => ({
      organizationId: row.organization_id,
      role: row.role,
    }));
}

export async function getCurrentOrganizationId(): Promise<string | null> {
  const memberships = await getOrganizationMembershipsForCurrentUser();
  return memberships[0]?.organizationId ?? null;
}

export async function getPrimaryOrganizationIdForUser(
  client: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string | null> {
  const { data } = await client
    .from("organization_memberships")
    .select("organization_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1);

  return data?.[0]?.organization_id ?? null;
}
