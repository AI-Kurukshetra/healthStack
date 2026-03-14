import type { AuthAction } from "@/lib/validations/auth.schema";
import { ZodError } from "zod";

type ApiErrorOptions = {
  code: string;
  message: string;
  status: number;
  details?: unknown;
};

type ErrorLike = {
  message?: string;
  status?: number;
};

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor({ code, message, status, details }: ApiErrorOptions) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function createValidationError(error: ZodError): ApiError {
  return new ApiError({
    code: "VALIDATION_ERROR",
    message: "Invalid request payload.",
    status: 400,
    details: error.flatten(),
  });
}

export function createJsonBodyError(): ApiError {
  return new ApiError({
    code: "VALIDATION_ERROR",
    message: "Invalid JSON body.",
    status: 400,
  });
}

export function mapAuthError(
  action: AuthAction | "session",
  error: unknown,
): ApiError {
  const message = getErrorMessage(error);
  const normalizedMessage = message.toLowerCase();
  const status = getErrorStatus(error);

  if (action === "session") {
    return new ApiError({
      code: "AUTH_SESSION_LOOKUP_FAILED",
      message: "Unable to load the current auth session.",
      status: status ?? 500,
    });
  }

  if (action === "sign-in") {
    if (normalizedMessage.includes("invalid login credentials")) {
      return new ApiError({
        code: "AUTH_INVALID_CREDENTIALS",
        message: "Invalid email or password.",
        status: 401,
      });
    }

    if (normalizedMessage.includes("email not confirmed")) {
      return new ApiError({
        code: "AUTH_EMAIL_NOT_CONFIRMED",
        message: "Confirm your email before signing in.",
        status: 403,
      });
    }

    return new ApiError({
      code: "AUTH_SIGN_IN_FAILED",
      message: "Unable to sign in.",
      status: status ?? 400,
    });
  }

  if (action === "sign-up") {
    if (normalizedMessage.includes("already registered")) {
      return new ApiError({
        code: "AUTH_ACCOUNT_EXISTS",
        message: "An account with that email already exists.",
        status: 409,
      });
    }

    if (
      normalizedMessage.includes("redirect url is not allowed") ||
      normalizedMessage.includes("invalid redirect url")
    ) {
      return new ApiError({
        code: "AUTH_REDIRECT_URL_NOT_ALLOWED",
        message:
          "Sign-up email redirect URL is not allowed. Add your app URL to Supabase Auth URL configuration.",
        status: 400,
      });
    }

    if (normalizedMessage.includes("signups not allowed for this instance")) {
      return new ApiError({
        code: "AUTH_SIGN_UP_DISABLED",
        message: "Email sign-ups are disabled in Supabase Auth settings.",
        status: 403,
      });
    }

    if (normalizedMessage.includes("database error saving new user")) {
      return new ApiError({
        code: "AUTH_SIGN_UP_DB_ERROR",
        message:
          "Supabase could not create the user. Check Supabase Auth logs for database trigger/policy errors.",
        status: 500,
      });
    }

    return new ApiError({
      code: "AUTH_SIGN_UP_FAILED",
      message: "Unable to create your account.",
      status: status ?? 400,
    });
  }

  return new ApiError({
    code: "AUTH_SIGN_OUT_FAILED",
    message: "Unable to sign out.",
    status: status ?? 500,
  });
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (isErrorLike(error) && typeof error.message === "string") {
    return error.message;
  }

  return "Unexpected error.";
}

function getErrorStatus(error: unknown): number | undefined {
  if (isErrorLike(error) && typeof error.status === "number") {
    return error.status;
  }

  return undefined;
}

function isErrorLike(error: unknown): error is ErrorLike {
  return typeof error === "object" && error !== null;
}
