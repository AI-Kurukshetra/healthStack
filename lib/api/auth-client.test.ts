import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AuthClientError,
  getAuthSession,
  signInWithApi,
  signUpWithApi,
} from "@/lib/api/auth-client";

const originalFetch = global.fetch;

describe("auth client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("parses sign-in response and exposes nextPath", async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: {
          user: {
            id: "5f5f3f38-f49f-4fa1-b2ef-a98e4a0df1a1",
            email: "user@example.com",
            emailConfirmedAt: "2026-03-14T11:00:00.000Z",
            lastSignInAt: "2026-03-14T11:00:00.000Z",
          },
          session: {
            isAuthenticated: true,
            needsEmailConfirmation: false,
          },
          nextPath: "/dashboard",
        },
        message: "Signed in.",
        requestId: "req-sign-in",
      }),
    })) as unknown as typeof global.fetch;

    const result = await signInWithApi({
      email: "user@example.com",
      password: "password123",
    });

    expect(result.data.nextPath).toBe("/dashboard");
    expect(result.message).toBe("Signed in.");
  });

  it("parses sign-up response and exposes email confirmation state", async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: {
          user: {
            id: "5f5f3f38-f49f-4fa1-b2ef-a98e4a0df1a1",
            email: "new-user@example.com",
            emailConfirmedAt: null,
            lastSignInAt: null,
          },
          session: {
            isAuthenticated: false,
            needsEmailConfirmation: true,
          },
          nextPath: "/sign-up-success",
        },
        message: "Check your email to confirm your account.",
        requestId: "req-sign-up",
      }),
    })) as unknown as typeof global.fetch;

    const result = await signUpWithApi({
      email: "new-user@example.com",
      password: "password123",
    });

    expect(result.data.session.needsEmailConfirmation).toBe(true);
    expect(result.data.nextPath).toBe("/sign-up-success");
  });

  it("throws AuthClientError for non-ok responses", async () => {
    global.fetch = vi.fn(async () => ({
      ok: false,
      json: async () => ({
        error: {
          code: "AUTH_INVALID_CREDENTIALS",
          message: "Invalid email or password.",
        },
        requestId: "req-invalid",
      }),
    })) as unknown as typeof global.fetch;

    await expect(
      signInWithApi({
        email: "bad@example.com",
        password: "password123",
      }),
    ).rejects.toMatchObject({
      name: "AuthClientError",
      code: "AUTH_INVALID_CREDENTIALS",
      message: "Invalid email or password.",
    } satisfies Partial<AuthClientError>);
  });

  it("parses auth session read payload", async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
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
      }),
    })) as unknown as typeof global.fetch;

    const result = await getAuthSession();

    expect(result.data.session.isAuthenticated).toBe(false);
    expect(result.meta.requestId).toBe("req-get");
  });
});

afterAll(() => {
  global.fetch = originalFetch;
});
