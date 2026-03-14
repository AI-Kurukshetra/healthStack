import { describe, expect, it } from "vitest";
import { getUserRole, isProvider } from "@/lib/auth/roles";

describe("auth roles", () => {
  it("returns provider role when present", () => {
    expect(getUserRole({ user_metadata: { role: "provider" } })).toBe("provider");
    expect(isProvider({ user_metadata: { role: "provider" } })).toBe(true);
  });

  it("returns unknown for missing or unsupported roles", () => {
    expect(getUserRole(null)).toBe("unknown");
    expect(getUserRole({ user_metadata: { role: "guest" } })).toBe("unknown");
    expect(isProvider({ user_metadata: { role: "patient" } })).toBe(false);
  });
});
