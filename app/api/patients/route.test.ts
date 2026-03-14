import { describe, expect, it } from "vitest";
import {
  handlePatientsGet,
  handlePatientsWrite,
} from "@/app/api/patients/handlers";

type RouteClient = Parameters<typeof handlePatientsGet>[0];
type RouteAuth = RouteClient["auth"];
type RouteFrom = RouteClient["from"];

function createRouteClient(options?: {
  user?: { id: string; email?: string | null } | null;
  organizationId?: string;
  profileRow?: {
    id: string;
    user_id: string;
    first_name: string;
    last_name: string;
    date_of_birth: string;
    created_at: string;
    updated_at: string;
  } | null;
}) {
  const auth: RouteAuth = {
    getUser: async () => ({
      data: { user: options?.user ?? null },
      error: null,
    }),
  };

  const from: RouteFrom = () => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({
          data: options?.profileRow ?? null,
          error: null,
        }),
        order: () => ({
          limit: async () => ({
            data: [
              {
                organization_id:
                  options?.organizationId ??
                  "5d2f64df-ad2b-4e2c-a667-3c8bc3f5fbc5",
              },
            ],
            error: null,
          }),
        }),
      }),
    }),
    upsert: () => ({
      select: () => ({
        single: async () => ({
          data:
            options?.profileRow ?? {
              id: "a98f9e2f-c8bd-4cc9-bcab-f0dd6f5d96af",
              user_id:
                options?.user?.id ?? "f7300c7a-dad9-4bdb-a05e-57a9f5e4e209",
              first_name: "Ava",
              last_name: "Shah",
              date_of_birth: "1992-04-11",
              created_at: "2026-03-14T12:00:00.000Z",
              updated_at: "2026-03-14T12:00:00.000Z",
            },
          error: null,
        }),
      }),
    }),
  });

  return {
    auth,
    from,
  } as RouteClient;
}

describe("patients route", () => {
  it("rejects anonymous GET access", async () => {
    const response = await handlePatientsGet(createRouteClient(), "req-anon");
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("AUTH_REQUIRED");
  });

  it("returns patient profile for authenticated user", async () => {
    const response = await handlePatientsGet(
      createRouteClient({
        user: { id: "f7300c7a-dad9-4bdb-a05e-57a9f5e4e209" },
        profileRow: {
          id: "a98f9e2f-c8bd-4cc9-bcab-f0dd6f5d96af",
          user_id: "f7300c7a-dad9-4bdb-a05e-57a9f5e4e209",
          first_name: "Ava",
          last_name: "Shah",
          date_of_birth: "1992-04-11",
          created_at: "2026-03-14T12:00:00.000Z",
          updated_at: "2026-03-14T12:00:00.000Z",
        },
      }),
      "req-get",
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.firstName).toBe("Ava");
    expect(body.meta.requestId).toBe("req-get");
  });

  it("creates or updates intake profile via write handler", async () => {
    const response = await handlePatientsWrite(
      createRouteClient({
        user: { id: "f7300c7a-dad9-4bdb-a05e-57a9f5e4e209" },
      }),
      "req-write",
      {
        firstName: "Ava",
        lastName: "Shah",
        dateOfBirth: "1992-04-11",
      },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.firstName).toBe("Ava");
    expect(body.message).toBe("Patient profile saved.");
    expect(body.requestId).toBe("req-write");
  });
});
