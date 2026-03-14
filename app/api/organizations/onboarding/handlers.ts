import { ApiError, createJsonBodyError, createValidationError } from "@/lib/api/errors";
import { createErrorResponse, createMutationResponse } from "@/lib/api/response";
import {
  organizationOnboardingSchema,
  type OrganizationOnboardingInput,
} from "@/lib/validations/organization.schema";

export type OnboardingRouteClient = {
  auth: {
    getUser: () => Promise<{
      data: { user: { id: string } | null };
      error: { message?: string } | null;
    }>;
  };
  from: (table: "organization_memberships" | "organizations") => {
    select: (query: string) => {
      eq: (column: "user_id" | "slug", value: string) => {
        limit: (count: 1) => Promise<{
          data: Array<{ id?: string }> | null;
          error: { message?: string } | null;
        }>;
      };
    };
    insert: (
      value:
        | { name: string; slug: string }
        | { organization_id: string; user_id: string; role: "owner" },
    ) => {
      select: (query: string) => {
        single: () => Promise<{
          data: { id: string; slug?: string; name?: string } | null;
          error: { message?: string } | null;
        }>;
      };
    };
  };
};

export async function handleOrganizationOnboardingPost(
  client: OnboardingRouteClient,
  requestId: string,
  payload: unknown,
) {
  const { data: authData, error: authError } = await client.auth.getUser();

  if (authError || !authData.user) {
    return createErrorResponse(
      new ApiError({
        code: "AUTH_REQUIRED",
        message: "Authentication required.",
        status: 401,
      }),
      requestId,
    );
  }

  const parsed = organizationOnboardingSchema.safeParse(payload);
  if (!parsed.success) {
    return createErrorResponse(createValidationError(parsed.error), requestId);
  }

  const userId = authData.user.id;

  const slug = parsed.data.slug.toLowerCase();
  const { data: existingSlugRows, error: slugLookupError } = await client
    .from("organizations")
    .select("id")
    .eq("slug", slug)
    .limit(1);

  if (slugLookupError) {
    return createErrorResponse(
      new ApiError({
        code: "ORG_ONBOARDING_LOOKUP_FAILED",
        message: "Unable to verify organization slug.",
        status: 500,
      }),
      requestId,
    );
  }

  if ((existingSlugRows ?? []).length > 0) {
    return createErrorResponse(
      new ApiError({
        code: "ORG_SLUG_TAKEN",
        message: "Organization slug is already in use.",
        status: 409,
      }),
      requestId,
    );
  }

  const { data: orgRow, error: orgInsertError } = await client
    .from("organizations")
    .insert({ name: parsed.data.name, slug })
    .select("id,name,slug")
    .single();

  if (orgInsertError || !orgRow) {
    return createErrorResponse(
      new ApiError({
        code: "ORG_CREATE_FAILED",
        message: "Unable to create organization.",
        status: 500,
      }),
      requestId,
    );
  }

  const { error: membershipInsertError } = await client
    .from("organization_memberships")
    .insert({
      organization_id: orgRow.id,
      user_id: userId,
      role: "owner",
    })
    .select("id")
    .single();

  if (membershipInsertError) {
    return createErrorResponse(
      new ApiError({
        code: "ORG_MEMBERSHIP_CREATE_FAILED",
        message: "Unable to create organization membership.",
        status: 500,
      }),
      requestId,
    );
  }

  return createMutationResponse(
    {
      organizationId: orgRow.id,
      slug,
      nextPath: "/dashboard",
    },
    requestId,
    "Organization onboarding completed.",
  );
}

export async function parseOrganizationOnboardingJsonBody(
  request: Request,
): Promise<OrganizationOnboardingInput> {
  try {
    return (await request.json()) as OrganizationOnboardingInput;
  } catch {
    throw createJsonBodyError();
  }
}
