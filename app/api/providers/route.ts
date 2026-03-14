import { ApiError } from "@/lib/api/errors";
import { createErrorResponse, createReadResponse } from "@/lib/api/response";
import { getRequestId } from "@/lib/api/request-id";
import { isProvider } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

type ProviderRouteUser = {
  id: string;
  user_metadata?: {
    role?: string;
  };
};

type ProviderRouteClient = {
  auth: {
    getUser: () => Promise<{
      data: { user: ProviderRouteUser | null };
      error: { message?: string } | null;
    }>;
  };
};

export async function GET(request: Request) {
  const requestId = getRequestId(request);

  try {
    const client = (await createClient()) as unknown as ProviderRouteClient;
    return await handleProviderGet(client, requestId);
  } catch {
    return createErrorResponse(
      new ApiError({
        code: "PROVIDER_QUEUE_FAILED",
        message: "Unable to load provider resource.",
        status: 500,
      }),
      requestId,
    );
  }
}

export async function handleProviderGet(
  client: ProviderRouteClient,
  requestId: string,
) {
  const { data, error } = await client.auth.getUser();

  if (error || !data.user) {
    return createErrorResponse(
      new ApiError({
        code: "AUTH_REQUIRED",
        message: "Authentication required.",
        status: 401,
      }),
      requestId,
    );
  }

  if (!isProvider(data.user)) {
    return createErrorResponse(
      new ApiError({
        code: "PROVIDER_ACCESS_DENIED",
        message: "Provider role required.",
        status: 403,
      }),
      requestId,
    );
  }

  return createReadResponse(
    {
      queue: [],
      summary: "Provider dashboard queue placeholder",
    },
    requestId,
  );
}
