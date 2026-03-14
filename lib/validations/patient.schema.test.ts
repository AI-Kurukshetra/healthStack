import { describe, expect, it } from "vitest";
import {
  patientProfilePayloadSchema,
  patientRecordSchema,
} from "@/lib/validations/patient.schema";

describe("patient schema", () => {
  it("accepts valid patient intake payload", () => {
    const payload = patientProfilePayloadSchema.parse({
      firstName: "Ava",
      lastName: "Shah",
      dateOfBirth: "1992-04-11",
    });

    expect(payload).toEqual({
      firstName: "Ava",
      lastName: "Shah",
      dateOfBirth: "1992-04-11",
    });
  });

  it("rejects invalid date format", () => {
    const result = patientProfilePayloadSchema.safeParse({
      firstName: "Ava",
      lastName: "Shah",
      dateOfBirth: "11/04/1992",
    });

    expect(result.success).toBe(false);
  });

  it("parses patient db record shape", () => {
    const record = patientRecordSchema.parse({
      id: "a98f9e2f-c8bd-4cc9-bcab-f0dd6f5d96af",
      userId: "f7300c7a-dad9-4bdb-a05e-57a9f5e4e209",
      firstName: "Ava",
      lastName: "Shah",
      dateOfBirth: "1992-04-11",
      createdAt: "2026-03-14T12:00:00.000Z",
      updatedAt: "2026-03-14T12:00:00.000Z",
    });

    expect(record.firstName).toBe("Ava");
  });
});
