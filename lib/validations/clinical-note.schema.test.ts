import { describe, expect, it } from "vitest";
import {
  clinicalNoteDraftSchema,
  clinicalNoteRecordSchema,
} from "@/lib/validations/clinical-note.schema";

describe("clinical note schema", () => {
  it("accepts valid draft payload", () => {
    const parsed = clinicalNoteDraftSchema.safeParse({
      noteType: "soap",
      content: "Subjective: patient reports relief after medication.",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects empty content", () => {
    const parsed = clinicalNoteDraftSchema.safeParse({
      noteType: "progress",
      content: "",
    });

    expect(parsed.success).toBe(false);
  });

  it("parses persisted record shape", () => {
    const parsed = clinicalNoteRecordSchema.safeParse({
      id: "34ba4e26-69ee-40bb-b4a6-8f25af367854",
      encounterId: "6ef76adf-49e5-4d6d-99cc-c1d2a7f9988f",
      patientId: "7f961b6b-b271-4c7c-86f9-29f0f4572f4d",
      providerId: "4f28c9cc-8de6-4e24-bf75-b4502bb99825",
      noteType: "soap",
      content: "Assessment: stable and improving.",
      version: 2,
      createdAt: "2026-03-14T10:00:00.000Z",
      updatedAt: "2026-03-14T10:10:00.000Z",
    });

    expect(parsed.success).toBe(true);
  });
});
