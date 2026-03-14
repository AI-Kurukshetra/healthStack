import { describe, expect, it } from "vitest";
import { handleAuthGet, handleAuthPost } from "@/app/api/auth/handlers";

type FakeUser = {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  user_metadata?: { role?: string };
};

type RouteClient = Parameters<typeof handleAuthGet>[0];
type RouteAuth = RouteClient["auth"];

function createFakeUser(overrides: Partial<FakeUser> = {}): FakeUser {
  return {
    id: "5f5f3f38-f49f-4fa1-b2ef-a98e4a0df1a1",
    email: "user@example.com",
    email_confirmed_at: "2026-03-14T11:00:00.000Z",
    last_sign_in_at: "2026-03-14T11:00:00.000Z",
    user_metadata: {},
    ...overrides,
  };
}

function createFakeAuthClient(overrides?: Partial<RouteAuth>): RouteClient {
  const auth: RouteAuth = {
    getUser: async () => ({ data: { user: null }, error: null }),
    signInWithPassword: async () => ({
      data: { user: createFakeUser(), session: { access_token: "token" } },
      error: null,
    }),
    signUp: async ({ email }) => ({
      data: {
        user: createFakeUser({
          email,
          email_confirmed_at: null,
          last_sign_in_at: null,
        }),
        session: null,
      },
      error: null,
    }),
    signOut: async () => ({
      error: null,
    }),
    ...overrides,
  };

  return {
    auth,
    from: () => ({
      insert: async () => ({ error: null }),
    }),
  };
}

describe("app/api/auth/route", () => {
  it("returns unauthenticated session state from GET", async () => {
    const response = await handleAuthGet(createFakeAuthClient(), "req-get");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      data: {
        user: null,
        session: {
          isAuthenticated: false,
          needsEmailConfirmation: false,
        },
      },
      meta: {
        requestId: "req-get",
      },
    });
  });

  it("rejects invalid sign-in payloads", async () => {
    const response = await handleAuthPost(
      createFakeAuthClient(),
      "req-invalid",
      new URL("http://localhost:3000/api/auth"),
      {
        action: "sign-in",
        email: "bad-email",
        password: "short",
      },
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.requestId).toBe("req-invalid");
  });

  it("signs in and returns authenticated session data", async () => {
    const auditEvents: Array<{ eventType: string; action: string }> = [];
    const response = await handleAuthPost(
      {
        ...createFakeAuthClient(),
        from: () => ({
          insert: async (value) => {
            auditEvents.push({
              eventType: value.event_type,
              action: value.action,
            });
            return { error: null };
          },
        }),
      },
      "req-sign-in",
      new URL("http://localhost:3000/api/auth"),
      {
        action: "sign-in",
        email: "user@example.com",
        password: "password123",
      },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      data: {
        user: {
          email: "user@example.com",
        },
        session: {
          isAuthenticated: true,
          needsEmailConfirmation: false,
        },
        nextPath: "/dashboard",
      },
      message: "Signed in.",
      requestId: "req-sign-in",
    });
    expect(auditEvents).toEqual([
      { eventType: "auth.sign_in", action: "sign-in" },
    ]);
  });

  it("returns confirmation-needed sign-up state when session is null", async () => {
    const response = await handleAuthPost(
      createFakeAuthClient(),
      "req-sign-up",
      new URL("http://localhost:3000/api/auth"),
      {
        action: "sign-up",
        email: "new-user@example.com",
        password: "password123",
      },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      data: {
        user: {
          email: "new-user@example.com",
        },
        session: {
          isAuthenticated: false,
          needsEmailConfirmation: true,
        },
        nextPath: "/sign-up-success",
      },
      message: "Check your email to confirm your account.",
      requestId: "req-sign-up",
    });
  });

  it("signs out the local session", async () => {
    let scope: "local" | null = null;

    const response = await handleAuthPost(
      createFakeAuthClient({
        signOut: async (options) => {
          scope = options.scope;
          return { error: null };
        },
      }),
      "req-sign-out",
      new URL("http://localhost:3000/api/auth"),
      {
        action: "sign-out",
      },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(scope).toBe("local");
    expect(body).toEqual({
      data: {
        nextPath: "/login",
        success: true,
      },
      message: "Signed out.",
      requestId: "req-sign-out",
    });
  });
});
