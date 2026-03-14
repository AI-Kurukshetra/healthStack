import { describe, expect, it } from "vitest";
import { mapAuthError } from "@/lib/api/errors";

describe("mapAuthError", () => {
  it("maps redirect-url signup failures to actionable error", () => {
    const error = mapAuthError("sign-up", {
      message: "Redirect URL is not allowed",
      status: 400,
    });

    expect(error.code).toBe("AUTH_REDIRECT_URL_NOT_ALLOWED");
    expect(error.status).toBe(400);
  });

  it("maps signup disabled failures", () => {
    const error = mapAuthError("sign-up", {
      message: "Signups not allowed for this instance",
      status: 403,
    });

    expect(error.code).toBe("AUTH_SIGN_UP_DISABLED");
    expect(error.status).toBe(403);
  });
});
