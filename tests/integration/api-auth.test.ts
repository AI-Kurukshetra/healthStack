import { beforeEach, describe, expect, it, vi } from "vitest";

const createClientMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

describe("api/auth route integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns unauthenticated session state on GET", async () => {
    createClientMock.mockResolvedValue({
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
      },
    });

    const { GET } = await import("@/app/api/auth/route");

    const response = await GET(new Request("http://localhost:3000/api/auth"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      data: {
        user: null,
        session: {
          isAuthenticated: false,
          needsEmailConfirmation: false,
        },
      },
    });
    expect(body.meta.requestId).toBeTypeOf("string");
  });

  it("returns a validation error for malformed sign-in payloads", async () => {
    createClientMock.mockResolvedValue({
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        signInWithPassword: async () => ({
          data: { user: null, session: null },
          error: null,
        }),
        signUp: async () => ({
          data: { user: null, session: null },
          error: null,
        }),
        signOut: async () => ({ error: null }),
      },
    });

    const { POST } = await import("@/app/api/auth/route");

    const response = await POST(
      new Request("http://localhost:3000/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sign-in",
          email: "bad-email",
          password: "short",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.requestId).toBeTypeOf("string");
  });

  it("returns sign-up confirmation flow payload when email confirmation is required", async () => {
    createClientMock.mockResolvedValue({
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        signInWithPassword: async () => ({
          data: { user: null, session: null },
          error: null,
        }),
        signUp: async () => ({
          data: {
            user: {
              id: "5f5f3f38-f49f-4fa1-b2ef-a98e4a0df1a1",
              email: "new-user@example.com",
              email_confirmed_at: null,
              last_sign_in_at: null,
            },
            session: null,
          },
          error: null,
        }),
        signOut: async () => ({ error: null }),
      },
    });

    const { POST } = await import("@/app/api/auth/route");

    const response = await POST(
      new Request("http://localhost:3000/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sign-up",
          email: "new-user@example.com",
          password: "password123",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      data: {
        session: {
          isAuthenticated: false,
          needsEmailConfirmation: true,
        },
        nextPath: "/sign-up-success",
      },
      message: "Check your email to confirm your account.",
    });
    expect(body.requestId).toBeTypeOf("string");
  });
});
