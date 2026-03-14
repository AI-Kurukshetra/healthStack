"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

const SwaggerUI = dynamic(
  () =>
    import("swagger-ui-react").then(
      (module) =>
        module.default as ComponentType<{
          url: string;
          docExpansion?: "list" | "full" | "none";
        }>,
    ),
  {
  ssr: false,
  loading: () => (
    <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-6">
      <p className="text-sm text-slate-600">Loading Swagger UI...</p>
    </div>
  ),
  },
);

export function SwaggerUiView() {
  return <SwaggerUI url="/api/docs" docExpansion="list" />;
}
