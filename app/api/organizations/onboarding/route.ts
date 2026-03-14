import { ApiError } from "@/lib/api/errors";
import { createErrorResponse } from "@/lib/api/response";
import { getRequestId } from "@/lib/api/request-id";
import { createClient } from "@/lib/supabase/server";
import {
  handleOrganizationOnboardingPost,
  parseOrganizationOnboardingJsonBody,
  type OnboardingRouteClient,
} from "./handlers";

export async function POST(request: Request) {
  const requestId = getRequestId(request);

  try {
    const payload = await parseOrganizationOnboardingJsonBody(request);
    const client = (await createClient()) as unknown as OnboardingRouteClient;
    return await handleOrganizationOnboardingPost(client, requestId, payload);
  } catch (error) {
    const apiError =
      error instanceof ApiError
        ? error
        : new ApiError({
            code: "ORG_ONBOARDING_FAILED",
            message: "Unable to complete organization onboarding.",
            status: 500,
          });

    return createErrorResponse(apiError, requestId);
  }
}
