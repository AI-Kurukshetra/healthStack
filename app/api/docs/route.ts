import { NextResponse } from "next/server";
import { getOpenApiSpec } from "@/lib/openapi/spec";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const spec = getOpenApiSpec(requestUrl.origin);

  return NextResponse.json(spec, {
    headers: {
      "cache-control": "no-store",
    },
  });
}
