import type { Metadata } from "next";
import { SwaggerUiView } from "@/components/docs/swagger-ui-view";

export const metadata: Metadata = {
  title: "API Docs",
  description: "Interactive Swagger documentation for Health Stack APIs.",
};

export default function ApiDocsPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8">
      <div className="mx-auto mb-6 max-w-6xl">
        <h1 className="text-2xl font-semibold text-slate-900">API Documentation</h1>
        <p className="mt-2 text-sm text-slate-600">
          Swagger UI for the current App Router API surface.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Raw spec: <a className="underline" href="/api/docs">/api/docs</a>
        </p>
      </div>
      <SwaggerUiView />
    </main>
  );
}
