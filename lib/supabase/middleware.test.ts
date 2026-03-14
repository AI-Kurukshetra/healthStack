import { describe, expect, it } from "vitest";
import { isPublicPath } from "@/lib/supabase/middleware";

describe("isPublicPath", () => {
  it("marks auth routes and auth API as public", () => {
    expect(isPublicPath("/pricing")).toBe(true);
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/register")).toBe(true);
    expect(isPublicPath("/forgot-password")).toBe(true);
    expect(isPublicPath("/update-password")).toBe(true);
    expect(isPublicPath("/sign-up-success")).toBe(true);
    expect(isPublicPath("/api/auth")).toBe(true);
    expect(isPublicPath("/api/auth/session")).toBe(true);
    expect(isPublicPath("/auth/confirm")).toBe(true);
    expect(isPublicPath("/auth/error")).toBe(true);
  });

  it("marks protected dashboard routes as non-public", () => {
    expect(isPublicPath("/dashboard")).toBe(false);
    expect(isPublicPath("/patient")).toBe(false);
    expect(isPublicPath("/provider")).toBe(false);
    expect(isPublicPath("/api/patients")).toBe(false);
  });
});
