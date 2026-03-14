import { ApiError } from "@/lib/api/errors";
import { createErrorResponse, createMutationResponse } from "@/lib/api/response";
import { getRequestId } from "@/lib/api/request-id";
import { getUserRole } from "@/lib/auth/roles";
import { getPrimaryOrganizationIdForUser } from "@/lib/auth/tenant";
import { insertAuditEvent } from "@/lib/audit/log";
import { createClient } from "@/lib/supabase/server";
import { prescriptionRecordSchema } from "@/lib/validations/prescription.schema";

const PRESCRIPTIONS_BUCKET = "patient-prescriptions";
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const allowedMimeTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);

export async function POST(request: Request) {
  const requestId = getRequestId(request);

  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return createErrorResponse(
        new ApiError({
          code: "AUTH_REQUIRED",
          message: "Authentication required.",
          status: 401,
        }),
        requestId,
      );
    }

    if (getUserRole(user) !== "patient") {
      return createErrorResponse(
        new ApiError({
          code: "PRESCRIPTION_UPLOAD_FORBIDDEN",
          message: "Only patients can upload prescriptions.",
          status: 403,
        }),
        requestId,
      );
    }

    const organizationId = await getPrimaryOrganizationIdForUser(supabase, user.id);
    if (!organizationId) {
      return createErrorResponse(
        new ApiError({
          code: "ORG_CONTEXT_REQUIRED",
          message: "No organization context found for current user.",
          status: 403,
        }),
        requestId,
      );
    }

    const { data: patient } = await supabase
      .from("patients")
      .select("id,organization_id")
      .eq("user_id", user.id)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (!patient) {
      return createErrorResponse(
        new ApiError({
          code: "PATIENT_PROFILE_REQUIRED",
          message: "Complete patient profile before uploading prescriptions.",
          status: 403,
        }),
        requestId,
      );
    }

    const formData = await request.formData();
    const fileEntry = formData.get("file");

    if (!(fileEntry instanceof File)) {
      return createErrorResponse(
        new ApiError({
          code: "PRESCRIPTION_FILE_REQUIRED",
          message: "Attach a prescription file before uploading.",
          status: 400,
        }),
        requestId,
      );
    }

    if (!allowedMimeTypes.has(fileEntry.type)) {
      return createErrorResponse(
        new ApiError({
          code: "PRESCRIPTION_FILE_TYPE_INVALID",
          message: "Only PDF, JPG, and PNG files are allowed.",
          status: 400,
        }),
        requestId,
      );
    }

    if (fileEntry.size <= 0 || fileEntry.size > MAX_UPLOAD_BYTES) {
      return createErrorResponse(
        new ApiError({
          code: "PRESCRIPTION_FILE_SIZE_INVALID",
          message: "File must be greater than 0 bytes and up to 5 MB.",
          status: 400,
        }),
        requestId,
      );
    }

    const sanitizedOriginalName = sanitizeFileName(fileEntry.name);
    const filePath = `${user.id}/${Date.now()}-${crypto.randomUUID()}-${sanitizedOriginalName}`;

    const { error: uploadError } = await supabase.storage
      .from(PRESCRIPTIONS_BUCKET)
      .upload(filePath, fileEntry, {
        upsert: false,
        contentType: fileEntry.type,
      });

    if (uploadError) {
      throw new ApiError({
        code: "PRESCRIPTION_UPLOAD_FAILED",
        message: "Unable to upload prescription file.",
        status: 500,
      });
    }

    const { data: insertedRow, error: insertError } = await supabase
      .from("patient_prescriptions")
      .insert({
        organization_id: patient.organization_id,
        patient_id: patient.id,
        uploaded_by: user.id,
        file_name: sanitizedOriginalName,
        file_path: filePath,
        mime_type: fileEntry.type,
        size_bytes: fileEntry.size,
      })
      .select("id,organization_id,patient_id,uploaded_by,file_name,file_path,mime_type,size_bytes,created_at")
      .single();

    if (insertError || !insertedRow) {
      await supabase.storage.from(PRESCRIPTIONS_BUCKET).remove([filePath]);
      throw new ApiError({
        code: "PRESCRIPTION_METADATA_SAVE_FAILED",
        message: "Prescription was uploaded but metadata save failed.",
        status: 500,
      });
    }

    const parsed = prescriptionRecordSchema.parse({
      id: insertedRow.id,
      organizationId: insertedRow.organization_id,
      patientId: insertedRow.patient_id,
      uploadedBy: insertedRow.uploaded_by,
      fileName: insertedRow.file_name,
      filePath: insertedRow.file_path,
      mimeType: insertedRow.mime_type,
      sizeBytes: insertedRow.size_bytes,
      createdAt: insertedRow.created_at,
    });

    await insertAuditEvent(supabase, {
      organizationId: patient.organization_id,
      eventType: "prescription.uploaded",
      action: "upload",
      resourceType: "patient_prescription",
      resourceId: parsed.id,
      actorId: user.id,
      actorRole: "patient",
      requestId,
      metadata: {
        fileName: parsed.fileName,
        mimeType: parsed.mimeType,
        sizeBytes: parsed.sizeBytes,
      },
    });

    return createMutationResponse(parsed, requestId, "Prescription uploaded.");
  } catch (error) {
    const apiError =
      error instanceof ApiError
        ? error
        : new ApiError({
            code: "PRESCRIPTION_UPLOAD_FAILED",
            message: "Unable to upload prescription.",
            status: 500,
          });

    return createErrorResponse(apiError, requestId);
  }
}

function sanitizeFileName(name: string): string {
  const trimmed = name.trim();
  const cleaned = trimmed.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
  return cleaned.length > 0 ? cleaned.slice(0, 120) : "prescription";
}
