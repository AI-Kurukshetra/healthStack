import { ApiError } from "@/lib/api/errors";
import { createErrorResponse } from "@/lib/api/response";
import { getRequestId } from "@/lib/api/request-id";
import { createClient } from "@/lib/supabase/server";
import {
  handleAvailabilityGet,
  type AvailabilityRouteClient,
} from "@/app/api/appointments/availability/handlers";

export async function GET(request: Request) {
  const requestId = getRequestId(request);

  try {
    const client = (await createClient()) as unknown as AvailabilityRouteClient;
    return await handleAvailabilityGet(client, requestId, new URL(request.url));
  } catch {
    return createErrorResponse(
      new ApiError({
        code: "APPOINTMENT_AVAILABILITY_FAILED",
        message: "Unable to load appointment availability.",
        status: 500,
      }),
      requestId,
    );
  }
}
