import { ApiError, createValidationError } from "@/lib/api/errors";
import { createErrorResponse } from "@/lib/api/response";
import {
  availabilityQuerySchema,
  availabilityReadResponseSchema,
  availabilitySlotSchema,
} from "@/lib/validations/appointment.schema";
import { NextResponse } from "next/server";

type AvailabilityUser = {
  id: string;
};

type AvailabilityRow = {
  id: string;
  provider_id: string;
  starts_at: string;
  ends_at: string;
  is_available: boolean;
};

export type AvailabilityRouteClient = {
  auth: {
    getUser: () => Promise<{
      data: { user: AvailabilityUser | null };
      error: { message?: string } | null;
    }>;
  };
  from: (table: "provider_availability_slots") => {
    select: (
      query: "id,provider_id,starts_at,ends_at,is_available",
    ) => {
      eq: (column: "is_available", value: true) => {
        gte: (column: "starts_at", value: string) => {
          lt: (column: "starts_at", value: string) => {
            order: (
              column: "starts_at",
              options: { ascending: true },
            ) => Promise<{
              data: AvailabilityRow[] | null;
              error: { message?: string } | null;
            }>;
          };
          order: (
            column: "starts_at",
            options: { ascending: true },
          ) => Promise<{
            data: AvailabilityRow[] | null;
            error: { message?: string } | null;
          }>;
        };
      };
    };
  };
};

export async function handleAvailabilityGet(
  client: AvailabilityRouteClient,
  requestId: string,
  requestUrl: URL,
) {
  const { data: authData, error: authError } = await client.auth.getUser();

  if (authError || !authData.user) {
    return createErrorResponse(
      new ApiError({
        code: "AUTH_REQUIRED",
        message: "Authentication required.",
        status: 401,
      }),
      requestId,
    );
  }

  const parsedQuery = availabilityQuerySchema.safeParse({
    date: requestUrl.searchParams.get("date") ?? undefined,
  });

  if (!parsedQuery.success) {
    return createErrorResponse(createValidationError(parsedQuery.error), requestId);
  }

  const nowIso = new Date().toISOString();
  const date = parsedQuery.data.date;
  const hasDate = typeof date === "string";
  const query = client
    .from("provider_availability_slots")
    .select("id,provider_id,starts_at,ends_at,is_available")
    .eq("is_available", true);

  const result = hasDate
    ? await query
        .gte("starts_at", `${date}T00:00:00.000Z`)
        .lt("starts_at", `${date}T23:59:59.999Z`)
        .order("starts_at", { ascending: true })
    : await query.gte("starts_at", nowIso).order("starts_at", { ascending: true });

  if (result.error) {
    return createErrorResponse(
      new ApiError({
        code: "APPOINTMENT_AVAILABILITY_FAILED",
        message: "Unable to load appointment availability.",
        status: 500,
      }),
      requestId,
    );
  }

  const slots = (result.data ?? []).map((row) =>
    availabilitySlotSchema.parse({
      id: row.id,
      providerId: row.provider_id,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      isAvailable: row.is_available,
    }),
  );

  return NextResponse.json(
    availabilityReadResponseSchema.parse({
      data: slots,
      meta: {
        requestId,
        count: slots.length,
      },
    }),
    {
      headers: {
        "x-request-id": requestId,
      },
    },
  );
}
