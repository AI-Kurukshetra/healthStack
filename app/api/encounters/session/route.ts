import { ApiError, createValidationError } from "@/lib/api/errors";
import { createErrorResponse, createReadResponse } from "@/lib/api/response";
import { getRequestId } from "@/lib/api/request-id";
import { getUserRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import {
  encounterSessionQuerySchema,
  encounterSessionResponseSchema,
} from "@/lib/validations/encounter.schema";

export async function GET(request: Request) {
  const requestId = getRequestId(request);

  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

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

    const parsedQuery = encounterSessionQuerySchema.safeParse({
      encounterId: new URL(request.url).searchParams.get("encounterId"),
    });

    if (!parsedQuery.success) {
      return createErrorResponse(
        createValidationError(parsedQuery.error),
        requestId,
      );
    }

    const { data: encounter, error: encounterError } = await supabase
      .from("encounters")
      .select("id,patient_id,provider_id,status")
      .eq("id", parsedQuery.data.encounterId)
      .maybeSingle();

    if (encounterError || !encounter) {
      return createErrorResponse(
        new ApiError({
          code: "ENCOUNTER_NOT_FOUND",
          message: "Encounter not found.",
          status: 404,
        }),
        requestId,
      );
    }

    const role = getUserRole(authData.user);
    let hasAccess = false;

    if (role === "provider" && encounter.provider_id === authData.user.id) {
      hasAccess = true;
    }

    if (role === "patient") {
      const { data: patient } = await supabase
        .from("patients")
        .select("id")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      hasAccess = patient?.id === encounter.patient_id;
    }

    if (!hasAccess) {
      return createErrorResponse(
        new ApiError({
          code: "ENCOUNTER_ACCESS_DENIED",
          message: "You are not authorized to open this encounter session.",
          status: 403,
        }),
        requestId,
      );
    }

    if (encounter.status !== "active" && encounter.status !== "connected") {
      return createErrorResponse(
        new ApiError({
          code: "ENCOUNTER_SESSION_UNAVAILABLE",
          message:
            "Encounter session is unavailable. Retry after the provider starts the encounter.",
          status: 409,
        }),
        requestId,
      );
    }

    const joinUrl = new URL(
      `/encounters/${encounter.id}/video`,
      new URL(request.url).origin,
    ).toString();

    return createReadResponse(
      encounterSessionResponseSchema.parse({
        encounterId: encounter.id,
        status: encounter.status,
        joinUrl,
      }),
      requestId,
    );
  } catch {
    return createErrorResponse(
      new ApiError({
        code: "ENCOUNTER_SESSION_FAILED",
        message: "Unable to create encounter session link.",
        status: 500,
      }),
      requestId,
    );
  }
}
