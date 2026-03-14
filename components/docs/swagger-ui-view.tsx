"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

type OpenApiSpec = Record<string, unknown>;

export function SwaggerUiView() {
  const [spec, setSpec] = useState<OpenApiSpec | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSpec() {
      try {
        const response = await fetch("/api/docs", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Failed to fetch API spec (${response.status})`);
        }

        const payload = (await response.json()) as OpenApiSpec;
        if (isMounted) {
          setSpec(payload);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load API spec.");
        }
      }
    }

    void loadSpec();

    return () => {
      isMounted = false;
    };
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-5xl rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900">
        <h2 className="text-lg font-semibold">Unable to load Swagger docs</h2>
        <p className="mt-2 text-sm">{error}</p>
      </div>
    );
  }

  if (!spec) {
    return (
      <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-600">Loading OpenAPI spec...</p>
      </div>
    );
  }

  return <SwaggerUI spec={spec} docExpansion="list" />;
}
