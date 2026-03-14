import {
  ApiError,
} from "@/lib/api/errors";
import {
  createErrorResponse,
} from "@/lib/api/response";
import {
  handlePatientsGet,
  handlePatientsWrite,
  parsePatientsJsonBody,
  type PatientsRouteClient,
} from "@/app/api/patients/handlers";
import { getRequestId } from "@/lib/api/request-id";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestId = getRequestId(request);

  try {
    const client = (await createClient()) as unknown as PatientsRouteClient;
    return await handlePatientsGet(client, requestId);
  } catch (error) {
    const apiError =
      error instanceof ApiError
        ? error
        : new ApiError({
            code: "PATIENTS_GET_FAILED",
            message: "Unable to load patient profile.",
            status: 500,
          });

    return createErrorResponse(apiError, requestId);
  }
}

export async function POST(request: Request) {
  return handleWriteRequest(request);
}

export async function PATCH(request: Request) {
  return handleWriteRequest(request);
}

async function handleWriteRequest(request: Request) {
  const requestId = getRequestId(request);

  try {
    const payload = await parsePatientsJsonBody(request);
    const client = (await createClient()) as unknown as PatientsRouteClient;
    return await handlePatientsWrite(client, requestId, payload);
  } catch (error) {
    const apiError =
      error instanceof ApiError
        ? error
        : new ApiError({
            code: "PATIENTS_SAVE_FAILED",
            message: "Unable to save patient profile.",
            status: 500,
          });

    return createErrorResponse(apiError, requestId);
  }
}
