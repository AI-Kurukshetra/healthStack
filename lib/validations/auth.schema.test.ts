import { describe, expect, it } from "vitest";
import {
  authMutationSchema,
  authSessionDataSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validations/auth.schema";

describe("auth schemas", () => {
  it("accepts valid sign-in credentials", () => {
    expect(
      signInSchema.parse({
        email: "user@example.com",
        password: "password123",
      }),
    ).toEqual({
      email: "user@example.com",
      password: "password123",
    });
  });

  it("rejects invalid sign-up credentials", () => {
    const result = signUpSchema.safeParse({
      email: "invalid-email",
      password: "short",
    });

    expect(result.success).toBe(false);
  });

  it("parses supported auth mutations", () => {
    expect(
      authMutationSchema.parse({
        action: "sign-out",
      }),
    ).toEqual({
      action: "sign-out",
    });
  });

  it("parses unauthenticated auth session state", () => {
    expect(
      authSessionDataSchema.parse({
        user: null,
        session: {
          isAuthenticated: false,
          needsEmailConfirmation: false,
        },
      }),
    ).toEqual({
      user: null,
      session: {
        isAuthenticated: false,
        needsEmailConfirmation: false,
      },
    });
  });
});
