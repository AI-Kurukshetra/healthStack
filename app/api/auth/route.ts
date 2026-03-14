import { ApiError } from "@/lib/api/errors";
import { createErrorResponse } from "@/lib/api/response";
import { getRequestId } from "@/lib/api/request-id";
import { createClient } from "@/lib/supabase/server";
import {
  handleAuthGet,
  handleAuthPost,
  parseAuthJsonBody,
  toAuthRouteError,
  type AuthRouteClient,
} from "./handlers";

export async function GET(request: Request) {
  const requestId = getRequestId(request);

  try {
    const client = (await createClient()) as unknown as AuthRouteClient;
    return await handleAuthGet(client, requestId);
  } catch (error) {
    const apiError =
      error instanceof ApiError
        ? error
        : new ApiError({
            code: "AUTH_SESSION_LOOKUP_FAILED",
            message: "Unable to load the current auth session.",
            status: 500,
          });

    return createErrorResponse(apiError, requestId);
  }
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);

  try {
    const payload = await parseAuthJsonBody(request);
    const client = (await createClient()) as unknown as AuthRouteClient;
    return await handleAuthPost(client, requestId, new URL(request.url), payload);
  } catch (error) {
    return createErrorResponse(toAuthRouteError(error), requestId);
  }
}
