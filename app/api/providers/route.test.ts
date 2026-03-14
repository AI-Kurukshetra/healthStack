import { describe, expect, it } from "vitest";
import { handleProviderGet } from "@/app/api/providers/route";

type RouteClient = Parameters<typeof handleProviderGet>[0];
type RouteAuth = RouteClient["auth"];

function createClient(role: string | null): RouteClient {
  const auth: RouteAuth = {
    getUser: async () => ({
      data: {
        user:
          role === null
            ? null
            : {
                id: "f7300c7a-dad9-4bdb-a05e-57a9f5e4e209",
                user_metadata: { role },
              },
      },
      error: null,
    }),
  };

  return { auth };
}

describe("provider API authorization", () => {
  it("requires authentication", async () => {
    const response = await handleProviderGet(createClient(null), "req-auth");
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("AUTH_REQUIRED");
  });

  it("denies non-provider users", async () => {
    const response = await handleProviderGet(createClient("patient"), "req-deny");
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("PROVIDER_ACCESS_DENIED");
  });

  it("allows provider users", async () => {
    const response = await handleProviderGet(
      createClient("provider"),
      "req-provider",
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.queue).toEqual([]);
    expect(body.meta.requestId).toBe("req-provider");
  });
});
