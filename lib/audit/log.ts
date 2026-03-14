export type AuditInsertClient = {
  from?: (table: "audit_logs") => {
    insert: (
      value: {
        organization_id?: string;
        event_type: string;
        action: string;
        resource_type: string;
        resource_id: string | null;
        actor_id: string | null;
        actor_role: string;
        metadata: Record<string, unknown>;
        request_id: string;
        occurred_at: string;
      },
    ) => PromiseLike<{ error: { message?: string } | null }>;
  };
};

export type AuditEvent = {
  organizationId?: string;
  eventType: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  actorId?: string;
  actorRole: string;
  requestId: string;
  metadata?: Record<string, unknown>;
};

export async function insertAuditEvent(
  client: AuditInsertClient,
  event: AuditEvent,
): Promise<void> {
  if (!client.from) {
    return;
  }

  try {
    const payload = {
      ...(event.organizationId ? { organization_id: event.organizationId } : {}),
      event_type: event.eventType,
      action: event.action,
      resource_type: event.resourceType,
      resource_id: event.resourceId ?? null,
      actor_id: event.actorId ?? null,
      actor_role: event.actorRole,
      metadata: event.metadata ?? {},
      request_id: event.requestId,
      occurred_at: new Date().toISOString(),
    };

    await client.from("audit_logs").insert(payload);
  } catch {
    // Best-effort logging: mutation flows must not fail when audit insert fails.
  }
}
