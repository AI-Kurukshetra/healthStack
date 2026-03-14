import {
  ApiError,
  createJsonBodyError,
  createValidationError,
} from "@/lib/api/errors";
import {
  createErrorResponse,
  createMutationResponse,
  createReadResponse,
} from "@/lib/api/response";
import {
  patientProfilePayloadSchema,
  patientRecordSchema,
  type PatientProfileInput,
  type PatientRecord,
} from "@/lib/validations/patient.schema";

type RouteUser = {
  id: string;
};

type QueryResult<T> = Promise<{ data: T; error: { message?: string } | null }>;

export type PatientsRouteClient = {
  auth: {
    getUser: () => QueryResult<{ user: RouteUser | null }>;
  };
  from: (table: "patients" | "organization_memberships") => {
    select: (query: string) => {
      eq: (column: "user_id", value: string) => {
        maybeSingle: () => QueryResult<DbPatientRow | null>;
        order?: (
          column: "created_at",
          options: { ascending: true },
        ) => {
          limit: (count: 1) => QueryResult<Array<{ organization_id: string }>>;
        };
      };
    };
    upsert: (
      value: {
        user_id: string;
        organization_id: string;
        first_name: string;
        last_name: string;
        date_of_birth: string;
      },
      options: { onConflict: "user_id" },
    ) => {
      select: (query: string) => {
        single: () => QueryResult<DbPatientRow>;
      };
    };
  };
};

type DbPatientRow = {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  created_at: string;
  updated_at: string;
};

export async function handlePatientsGet(
  client: PatientsRouteClient,
  requestId: string,
) {
  const user = await getAuthenticatedUser(client);

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

  const { data, error } = await client
    .from("patients")
    .select("id,user_id,first_name,last_name,date_of_birth,created_at,updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return createErrorResponse(
      new ApiError({
        code: "PATIENTS_GET_FAILED",
        message: "Unable to load patient profile.",
        status: 500,
      }),
      requestId,
    );
  }

  const mapped = data === null ? null : mapPatientRecord(data);

  return createReadResponse(mapped, requestId);
}

export async function handlePatientsWrite(
  client: PatientsRouteClient,
  requestId: string,
  payload: unknown,
) {
  const user = await getAuthenticatedUser(client);

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

  const parsed = patientProfilePayloadSchema.safeParse(payload);

  if (!parsed.success) {
    return createErrorResponse(createValidationError(parsed.error), requestId);
  }

  const organizationId = await getCurrentOrganizationId(client, user.id);
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

  const { data, error } = await client
    .from("patients")
    .upsert(
      {
        user_id: user.id,
        organization_id: organizationId,
        first_name: parsed.data.firstName,
        last_name: parsed.data.lastName,
        date_of_birth: parsed.data.dateOfBirth,
      },
      {
        onConflict: "user_id",
      },
    )
    .select("id,user_id,first_name,last_name,date_of_birth,created_at,updated_at")
    .single();

  if (error) {
    return createErrorResponse(
      new ApiError({
        code: "PATIENTS_SAVE_FAILED",
        message: "Unable to save patient profile.",
        status: 500,
      }),
      requestId,
    );
  }

  return createMutationResponse(
    mapPatientRecord(data),
    requestId,
    "Patient profile saved.",
  );
}

async function getCurrentOrganizationId(
  client: PatientsRouteClient,
  userId: string,
): Promise<string | null> {
  const selection = client
    .from("organization_memberships")
    .select("organization_id")
    .eq("user_id", userId);

  if (!("order" in selection)) {
    return null;
  }

  if (!selection.order) {
    return null;
  }

  const { data, error } = await selection
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) {
    return null;
  }

  return data?.[0]?.organization_id ?? null;
}

export async function parsePatientsJsonBody(
  request: Request,
): Promise<PatientProfileInput> {
  try {
    return (await request.json()) as PatientProfileInput;
  } catch {
    throw createJsonBodyError();
  }
}

async function getAuthenticatedUser(
  client: PatientsRouteClient,
): Promise<RouteUser | null> {
  const { data, error } = await client.auth.getUser();

  if (error) {
    return null;
  }

  return data.user;
}

function mapPatientRecord(row: DbPatientRow): PatientRecord {
  return patientRecordSchema.parse({
    id: row.id,
    userId: row.user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    dateOfBirth: row.date_of_birth,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}
