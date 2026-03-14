import { describe, expect, it } from "vitest";
import { prescriptionRecordSchema } from "@/lib/validations/prescription.schema";

describe("prescription schema", () => {
  it("parses a valid prescription record", () => {
    const parsed = prescriptionRecordSchema.parse({
      id: "5ac0553d-c5df-4939-9bc1-e2dc0e1dbf57",
      organizationId: "7f961b6b-b271-4c7c-86f9-29f0f4572f4d",
      patientId: "4d6894ca-abef-4c5d-975b-0c6537f4cd3f",
      uploadedBy: "9e2be0be-1d8f-4ef1-af9b-9fc8adccf0f5",
      fileName: "prescription.pdf",
      filePath: "9e2be0be-1d8f-4ef1-af9b-9fc8adccf0f5/file.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024,
      createdAt: "2026-03-14T10:00:00+00:00",
      downloadUrl: "https://example.com/download",
    });

    expect(parsed.fileName).toBe("prescription.pdf");
  });

  it("rejects invalid size", () => {
    const result = prescriptionRecordSchema.safeParse({
      id: "5ac0553d-c5df-4939-9bc1-e2dc0e1dbf57",
      organizationId: "7f961b6b-b271-4c7c-86f9-29f0f4572f4d",
      patientId: "4d6894ca-abef-4c5d-975b-0c6537f4cd3f",
      uploadedBy: "9e2be0be-1d8f-4ef1-af9b-9fc8adccf0f5",
      fileName: "prescription.pdf",
      filePath: "9e2be0be-1d8f-4ef1-af9b-9fc8adccf0f5/file.pdf",
      mimeType: "application/pdf",
      sizeBytes: 0,
      createdAt: "2026-03-14T10:00:00+00:00",
    });

    expect(result.success).toBe(false);
  });
});
