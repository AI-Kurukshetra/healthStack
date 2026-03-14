import { describe, expect, it } from "vitest";
import { handleAvailabilityGet } from "@/app/api/appointments/availability/handlers";

type RouteClient = Parameters<typeof handleAvailabilityGet>[0];
type RouteAuth = RouteClient["auth"];
type RouteFrom = RouteClient["from"];

function createRouteClient(options?: {
  user?: { id: string } | null;
  rows?: Array<{
    id: string;
    provider_id: string;
    starts_at: string;
    ends_at: string;
    is_available: boolean;
  }>;
}) {
  const auth: RouteAuth = {
    getUser: async () => ({
      data: { user: options?.user ?? null },
      error: null,
    }),
  };

  const rows = options?.rows ?? [];
  const from: RouteFrom = () => ({
    select: () => ({
      eq: () => ({
        gte: () => ({
          lt: () => ({
            order: async () => ({
              data: rows,
              error: null,
            }),
          }),
          order: async () => ({
            data: rows,
            error: null,
          }),
        }),
      }),
    }),
  });

  return { auth, from } as RouteClient;
}

describe("appointment availability route", () => {
  it("denies anonymous access", async () => {
    const response = await handleAvailabilityGet(
      createRouteClient(),
      "req-auth",
      new URL("http://localhost:3000/api/appointments/availability"),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("AUTH_REQUIRED");
  });

  it("returns available slots for authenticated users", async () => {
    const response = await handleAvailabilityGet(
      createRouteClient({
        user: { id: "9e6db63b-4d48-4e06-b53c-e4d6f7f95b31" },
        rows: [
          {
            id: "a7dff3ce-4c5b-4f19-9b3f-f70cc8ca42f4",
            provider_id: "3f7406f2-f4c6-43f7-82eb-034c0656fe8a",
            starts_at: "2026-03-20T10:00:00.000Z",
            ends_at: "2026-03-20T10:30:00.000Z",
            is_available: true,
          },
        ],
      }),
      "req-slots",
      new URL("http://localhost:3000/api/appointments/availability"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.meta.count).toBe(1);
    expect(body.data[0].providerId).toBe("3f7406f2-f4c6-43f7-82eb-034c0656fe8a");
  });

  it("returns empty list when no slots exist", async () => {
    const response = await handleAvailabilityGet(
      createRouteClient({
        user: { id: "9e6db63b-4d48-4e06-b53c-e4d6f7f95b31" },
        rows: [],
      }),
      "req-empty",
      new URL("http://localhost:3000/api/appointments/availability"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([]);
    expect(body.meta.count).toBe(0);
  });
});
