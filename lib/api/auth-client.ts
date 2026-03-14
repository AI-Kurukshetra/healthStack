import {
  authMutationResponseSchema,
  authSessionDataSchema,
  authReadResponseSchema,
  type SignInInput,
  type SignUpInput,
} from "@/lib/validations/auth.schema";
import { z } from "zod";

const authErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
  requestId: z.string(),
});

export class AuthClientError extends Error {
  readonly code: string;
  readonly requestId?: string;
  readonly details?: unknown;
  readonly status?: number;

  constructor(options: {
    code: string;
    message: string;
    requestId?: string;
    details?: unknown;
    status?: number;
  }) {
    super(options.message);
    this.name = "AuthClientError";
    this.code = options.code;
    this.requestId = options.requestId;
    this.details = options.details;
    this.status = options.status;
  }
}

export async function getAuthSession() {
  const response = await fetch("/api/auth", {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  return parseReadResponse(response);
}

export async function signInWithApi(input: SignInInput) {
  const result = await postAuth({
    action: "sign-in",
    ...input,
  });

  return ensureSessionMutationResponse(result);
}

export async function signUpWithApi(input: SignUpInput) {
  const result = await postAuth({
    action: "sign-up",
    ...input,
  });

  return ensureSessionMutationResponse(result);
}

async function postAuth(payload: unknown) {
  const response = await fetch("/api/auth", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseMutationResponse(response);
}

async function parseReadResponse(response: Response) {
  const payload = await response.json();

  if (!response.ok) {
    throw toAuthClientError(payload, response.status);
  }

  const parsed = authReadResponseSchema.safeParse(payload);

  if (!parsed.success) {
    throw new AuthClientError({
      code: "AUTH_RESPONSE_INVALID",
      message: "Invalid auth session response.",
      details: parsed.error.flatten(),
      status: response.status,
    });
  }

  return parsed.data;
}

async function parseMutationResponse(response: Response) {
  const payload = await response.json();

  if (!response.ok) {
    throw toAuthClientError(payload, response.status);
  }

  const parsed = authMutationResponseSchema.safeParse(payload);

  if (!parsed.success) {
    throw new AuthClientError({
      code: "AUTH_RESPONSE_INVALID",
      message: "Invalid auth mutation response.",
      details: parsed.error.flatten(),
      status: response.status,
    });
  }

  return parsed.data;
}

function ensureSessionMutationResponse(
  response: z.infer<typeof authMutationResponseSchema>,
) {
  const parsed = authSessionDataSchema.safeParse(response.data);

  if (!parsed.success) {
    throw new AuthClientError({
      code: "AUTH_RESPONSE_INVALID",
      message: "Invalid auth session payload.",
      details: parsed.error.flatten(),
    });
  }

  return {
    ...response,
    data: parsed.data,
  };
}

function toAuthClientError(payload: unknown, status: number): AuthClientError {
  const parsed = authErrorResponseSchema.safeParse(payload);

  if (parsed.success) {
    return new AuthClientError({
      code: parsed.data.error.code,
      message: parsed.data.error.message,
      details: parsed.data.error.details,
      requestId: parsed.data.requestId,
      status,
    });
  }

  return new AuthClientError({
    code: "AUTH_REQUEST_FAILED",
    message: "Auth request failed.",
    details: payload,
    status,
  });
}
