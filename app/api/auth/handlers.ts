import {
  ApiError,
  createJsonBodyError,
  createValidationError,
  mapAuthError,
} from "@/lib/api/errors";
import {
  createErrorResponse,
  createMutationResponse,
  createReadResponse,
} from "@/lib/api/response";
import { getUserRole } from "@/lib/auth/roles";
import { insertAuditEvent } from "@/lib/audit/log";
import {
  authMutationSchema,
  authSessionDataSchema,
  signOutResultSchema,
  type AuthMutationInput,
  type AuthUser,
} from "@/lib/validations/auth.schema";

type AuthProviderError = {
  message?: string;
  status?: number;
};

type AuthProviderUser = {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
  last_sign_in_at?: string | null;
  user_metadata?: { role?: string };
};

export type AuthRouteClient = {
  auth: {
    getUser: () => Promise<{
      data: { user: AuthProviderUser | null };
      error: AuthProviderError | null;
    }>;
    signInWithPassword: (credentials: {
      email: string;
      password: string;
    }) => Promise<{
      data: {
        session: object | null;
        user: AuthProviderUser | null;
      };
      error: AuthProviderError | null;
    }>;
    signUp: (credentials: {
      email: string;
      password: string;
      options: { emailRedirectTo: string };
    }) => Promise<{
      data: {
        session: object | null;
        user: AuthProviderUser | null;
      };
      error: AuthProviderError | null;
    }>;
    signOut: (options: { scope: "local" }) => Promise<{
      error: AuthProviderError | null;
    }>;
  };
  from?: (table: "audit_logs") => {
    insert: (
      value: {
        event_type: string;
        action: string;
        resource_type: string;
        resource_id: string | null;
        actor_id: string | null;
        actor_role: string;
        metadata: Record<string, unknown>;
        request_id: string;
        occurred_at: string;
      },
    ) => PromiseLike<{ error: { message?: string } | null }>;
  };
};

export async function handleAuthGet(
  client: AuthRouteClient,
  requestId: string,
) {
  const { data, error } = await client.auth.getUser();

  if (error) {
    return createErrorResponse(mapAuthError("session", error), requestId);
  }

  const sessionData = buildSessionData(data.user, {
    isAuthenticated: data.user !== null,
  });

  return createReadResponse(sessionData, requestId);
}

export async function handleAuthPost(
  client: AuthRouteClient,
  requestId: string,
  requestUrl: URL,
  payload: unknown,
) {
  const parsedPayload = authMutationSchema.safeParse(payload);

  if (!parsedPayload.success) {
    return createErrorResponse(
      createValidationError(parsedPayload.error),
      requestId,
    );
  }

  const input = parsedPayload.data;

  switch (input.action) {
    case "sign-in":
      return handleSignIn(client, requestId, input);
    case "sign-up":
      return handleSignUp(client, requestId, requestUrl, input);
    case "sign-out":
      return handleSignOut(client, requestId);
  }
}

async function handleSignIn(
  client: AuthRouteClient,
  requestId: string,
  input: Extract<AuthMutationInput, { action: "sign-in" }>,
) {
  const { data, error } = await client.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error) {
    return createErrorResponse(mapAuthError("sign-in", error), requestId);
  }

  const responseData = buildSessionData(data.user, {
    isAuthenticated: data.session !== null,
    nextPath: "/dashboard",
  });

  await insertAuditEvent(client, {
    eventType: "auth.sign_in",
    action: "sign-in",
    resourceType: "auth",
    actorId: data.user?.id,
    actorRole: getUserRole(data.user),
    requestId,
    metadata: {
      authenticated: data.session !== null,
    },
  });

  return createMutationResponse(responseData, requestId, "Signed in.");
}

async function handleSignUp(
  client: AuthRouteClient,
  requestId: string,
  requestUrl: URL,
  input: Extract<AuthMutationInput, { action: "sign-up" }>,
) {
  const { data, error } = await client.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: new URL(
        "/auth/confirm?next=/dashboard",
        requestUrl.origin,
      ).toString(),
    },
  });

  if (error) {
    return createErrorResponse(mapAuthError("sign-up", error), requestId);
  }

  const needsEmailConfirmation = data.session === null;
  const responseData = buildSessionData(data.user, {
    isAuthenticated: data.session !== null,
    needsEmailConfirmation,
    nextPath: needsEmailConfirmation ? "/sign-up-success" : "/dashboard",
  });

  const message = needsEmailConfirmation
    ? "Check your email to confirm your account."
    : "Signed up.";

  await insertAuditEvent(client, {
    eventType: "auth.sign_up",
    action: "sign-up",
    resourceType: "auth",
    actorId: data.user?.id,
    actorRole: getUserRole(data.user),
    requestId,
    metadata: {
      needsEmailConfirmation,
    },
  });

  return createMutationResponse(responseData, requestId, message);
}

async function handleSignOut(client: AuthRouteClient, requestId: string) {
  const { data: beforeSignOut } = await client.auth.getUser();
  const { error } = await client.auth.signOut({ scope: "local" });

  if (error) {
    return createErrorResponse(mapAuthError("sign-out", error), requestId);
  }

  const responseData = signOutResultSchema.parse({
    success: true,
    nextPath: "/login",
  });

  await insertAuditEvent(client, {
    eventType: "auth.sign_out",
    action: "sign-out",
    resourceType: "auth",
    actorId: beforeSignOut.user?.id,
    actorRole: getUserRole(beforeSignOut.user),
    requestId,
  });

  return createMutationResponse(responseData, requestId, "Signed out.");
}

function buildSessionData(
  user: AuthProviderUser | null,
  options: {
    isAuthenticated: boolean;
    needsEmailConfirmation?: boolean;
    nextPath?: string;
  },
) {
  return authSessionDataSchema.parse({
    user: user === null ? null : toAuthUser(user),
    session: {
      isAuthenticated: options.isAuthenticated,
      needsEmailConfirmation: options.needsEmailConfirmation ?? false,
    },
    ...(options.nextPath === undefined ? {} : { nextPath: options.nextPath }),
  });
}

function toAuthUser(user: AuthProviderUser): AuthUser {
  return {
    id: user.id,
    email: user.email ?? null,
    emailConfirmedAt: user.email_confirmed_at ?? null,
    lastSignInAt: user.last_sign_in_at ?? null,
  };
}

export async function parseAuthJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw createJsonBodyError();
  }
}

export function toAuthRouteError(error: unknown) {
  return error instanceof ApiError
    ? error
    : new ApiError({
        code: "AUTH_REQUEST_FAILED",
        message: "Unable to complete the auth request.",
        status: 500,
      });
}
