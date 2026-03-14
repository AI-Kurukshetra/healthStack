export function getRequestId(request: Request): string {
  const headerValue = request.headers.get("x-request-id");

  if (headerValue && headerValue.trim().length > 0) {
    return headerValue;
  }

  return crypto.randomUUID();
}
