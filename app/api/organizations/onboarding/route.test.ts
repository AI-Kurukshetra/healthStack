import { describe, expect, it } from "vitest";
import { handleOrganizationOnboardingPost } from "@/app/api/organizations/onboarding/handlers";

type RouteClient = Parameters<typeof handleOrganizationOnboardingPost>[0];
type AdminClient = NonNullable<
  Parameters<typeof handleOrganizationOnboardingPost>[3]
>["adminClient"];

function createClient(options?: {
  userId?: string | null;
  role?: "admin" | "provider" | "patient";
}): RouteClient {
  const userId =
    options?.userId === undefined
      ? "f7300c7a-dad9-4bdb-a05e-57a9f5e4e209"
      : options.userId;

  return {
    auth: {
      getUser: async () => ({
        data: {
          user: userId
            ? { id: userId, user_metadata: { role: options?.role ?? "provider" } }
            : null,
        },
        error: null,
      }),
    },
  };
}

function createAdminClient(options?: {
  hasSlug?: boolean;
  membershipRoles?: string[];
}): AdminClient {
  return {
    from: (table) => {
      if (table === "organization_memberships") {
        return {
          select: () => ({
            eq: () => ({
              limit: async () => ({
                data: (options?.membershipRoles ?? []).map((role) => ({ role })),
                error: null,
              }),
            }),
          }),
          insert: () => ({
            select: () => ({
              single: async () => ({
                data: { id: "membership-created" },
                error: null,
              }),
            }),
          }),
        };
      }

      return {
        select: () => ({
          eq: () => ({
            limit: async () => ({
              data: options?.hasSlug ? [{ id: "org-existing" }] : [],
              error: null,
            }),
          }),
        }),
        insert: () => ({
          select: () => ({
            single: async () => ({
              data: {
                id: "a98f9e2f-c8bd-4cc9-bcab-f0dd6f5d96af",
                slug: "acme-clinic",
                name: "Acme Clinic",
              },
              error: null,
            }),
          }),
        }),
      };
    },
  };
}

describe("organization onboarding route", () => {
  it("rejects anonymous access", async () => {
    const response = await handleOrganizationOnboardingPost(
      createClient({ userId: null }),
      "req-auth",
      { name: "Acme Clinic", slug: "acme-clinic" },
      { adminClient: createAdminClient() },
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("AUTH_REQUIRED");
  });

  it("creates organization and owner membership", async () => {
    const response = await handleOrganizationOnboardingPost(
      createClient(),
      "req-create",
      { name: "Acme Clinic", slug: "acme-clinic" },
      { adminClient: createAdminClient({ membershipRoles: ["owner"] }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.organizationId).toBe("a98f9e2f-c8bd-4cc9-bcab-f0dd6f5d96af");
    expect(body.data.nextPath).toBe("/dashboard");
  });

  it("rejects slug conflict", async () => {
    const response = await handleOrganizationOnboardingPost(
      createClient(),
      "req-slug",
      { name: "Acme Clinic", slug: "acme-clinic" },
      { adminClient: createAdminClient({ hasSlug: true, membershipRoles: ["owner"] }) },
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.code).toBe("ORG_SLUG_TAKEN");
  });

  it("rejects provider without owner/admin membership", async () => {
    const response = await handleOrganizationOnboardingPost(
      createClient({ role: "provider" }),
      "req-forbidden",
      { name: "Acme Clinic", slug: "acme-clinic" },
      { adminClient: createAdminClient({ membershipRoles: ["provider"] }) },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("ORG_CREATE_FORBIDDEN");
  });

  it("allows platform admin without membership lookup", async () => {
    const response = await handleOrganizationOnboardingPost(
      createClient({ role: "admin" }),
      "req-platform-admin",
      { name: "Acme Clinic", slug: "acme-clinic" },
      { adminClient: createAdminClient() },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.organizationId).toBe("a98f9e2f-c8bd-4cc9-bcab-f0dd6f5d96af");
  });
});
