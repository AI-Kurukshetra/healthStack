import { describe, expect, it } from "vitest";
import {
  availabilityQuerySchema,
  availabilitySlotSchema,
} from "@/lib/validations/appointment.schema";

describe("appointment availability schema", () => {
  it("parses valid availability slot", () => {
    const slot = availabilitySlotSchema.parse({
      id: "64ee7806-e2bb-421c-be5a-9c5aebf3b682",
      providerId: "3f7406f2-f4c6-43f7-82eb-034c0656fe8a",
      startsAt: "2026-03-15T10:00:00.000Z",
      endsAt: "2026-03-15T10:30:00.000Z",
      isAvailable: true,
    });

    expect(slot.providerId).toBe("3f7406f2-f4c6-43f7-82eb-034c0656fe8a");
  });

  it("rejects invalid date query format", () => {
    const result = availabilityQuerySchema.safeParse({ date: "03-15-2026" });
    expect(result.success).toBe(false);
  });
});
