import { ApiError } from "@/lib/api/errors";
import { createErrorResponse, createMutationResponse } from "@/lib/api/response";
import { getRequestId } from "@/lib/api/request-id";
import { getUserRole } from "@/lib/auth/roles";
import { insertAuditEvent } from "@/lib/audit/log";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { prescriptionRecordSchema } from "@/lib/validations/prescription.schema";
import { z } from "zod";

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

    const role = getUserRole(user);
    if (role !== "patient" && role !== "admin") {
      return createErrorResponse(
        new ApiError({
          code: "PRESCRIPTION_UPLOAD_FORBIDDEN",
          message: "Only patients and platform admins can upload prescriptions.",
          status: 403,
        }),
        requestId,
      );
    }

    const formData = await request.formData();
    const fileEntry = formData.get("file");
    const patientIdInput = formData.get("patientId");
    const adminClient = createAdminClient();

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

    const targetPatient = await resolveTargetPatient({
      adminClient,
      actorId: user.id,
      actorRole: role,
      patientIdInput,
    });

    if (!targetPatient) {
      return createErrorResponse(
        new ApiError({
          code: "PATIENT_PROFILE_REQUIRED",
          message: "Target patient profile was not found.",
          status: 404,
        }),
        requestId,
      );
    }

    const sanitizedOriginalName = sanitizeFileName(fileEntry.name);
    const filePath = `${targetPatient.userId}/${Date.now()}-${crypto.randomUUID()}-${sanitizedOriginalName}`;

    const { error: uploadError } = await adminClient.storage
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

    const { data: insertedRow, error: insertError } = await adminClient
      .from("patient_prescriptions")
      .insert({
        organization_id: targetPatient.organizationId,
        patient_id: targetPatient.id,
        uploaded_by: user.id,
        file_name: sanitizedOriginalName,
        file_path: filePath,
        mime_type: fileEntry.type,
        size_bytes: fileEntry.size,
      })
      .select("id,organization_id,patient_id,uploaded_by,file_name,file_path,mime_type,size_bytes,created_at")
      .single();

    if (insertError || !insertedRow) {
      await adminClient.storage.from(PRESCRIPTIONS_BUCKET).remove([filePath]);
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
      organizationId: targetPatient.organizationId,
      eventType: "prescription.uploaded",
      action: "upload",
      resourceType: "patient_prescription",
      resourceId: parsed.id,
      actorId: user.id,
      actorRole: role,
      requestId,
      metadata: {
        targetPatientId: targetPatient.id,
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

async function resolveTargetPatient({
  adminClient,
  actorId,
  actorRole,
  patientIdInput,
}: {
  adminClient: ReturnType<typeof createAdminClient>;
  actorId: string;
  actorRole: "patient" | "admin";
  patientIdInput: FormDataEntryValue | null;
}) {
  if (actorRole === "patient") {
    const { data } = await adminClient
      .from("patients")
      .select("id,user_id,organization_id")
      .eq("user_id", actorId)
      .maybeSingle();
    if (!data) {
      return null;
    }
    return { id: data.id, userId: data.user_id, organizationId: data.organization_id };
  }

  const patientIdParseResult =
    typeof patientIdInput === "string" && patientIdInput.length > 0
      ? patientIdSchema.safeParse(patientIdInput)
      : null;

  if (!patientIdParseResult || !patientIdParseResult.success) {
    throw new ApiError({
      code: "PATIENT_ID_REQUIRED",
      message: "patientId is required when admin uploads a prescription.",
      status: 400,
    });
  }
  const patientId = patientIdParseResult.data;

  const { data } = await adminClient
    .from("patients")
    .select("id,user_id,organization_id")
    .eq("id", patientId)
    .maybeSingle();

  if (!data) {
    return null;
  }

  return { id: data.id, userId: data.user_id, organizationId: data.organization_id };
}

const patientIdSchema = z.string().uuid();

function sanitizeFileName(name: string): string {
  const trimmed = name.trim();
  const cleaned = trimmed.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
  return cleaned.length > 0 ? cleaned.slice(0, 120) : "prescription";
}
