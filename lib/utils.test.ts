import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("merges and preserves class names", () => {
    expect(cn("p-2", "text-sm", "p-4")).toContain("p-4");
  });
});
