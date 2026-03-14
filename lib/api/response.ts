import { ApiError } from "@/lib/api/errors";
import { NextResponse } from "next/server";

function createHeaders(requestId: string): HeadersInit {
  return {
    "x-request-id": requestId,
  };
}

export function createReadResponse<T>(data: T, requestId: string) {
  return NextResponse.json(
    {
      data,
      meta: {
        requestId,
      },
    },
    {
      headers: createHeaders(requestId),
    },
  );
}

export function createMutationResponse<T>(
  data: T,
  requestId: string,
  message: string,
) {
  return NextResponse.json(
    {
      data,
      message,
      requestId,
    },
    {
      headers: createHeaders(requestId),
    },
  );
}

export function createErrorResponse(error: ApiError, requestId: string) {
  return NextResponse.json(
    {
      error: {
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
      },
      requestId,
    },
    {
      headers: createHeaders(requestId),
      status: error.status,
    },
  );
}
