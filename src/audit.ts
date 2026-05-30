/**
 * Audit resource for accessing and exporting the immutable audit log.
 *
 * Every API action that mutates state is captured in the audit log.
 * Logs can be filtered, retrieved individually, and exported to CSV or JSON.
 */

import type { Transport } from "./transport.js";

/** A single audit log entry. */
export interface AuditLog {
  /** UUID of the audit log entry. */
  id: string;
  /** Action performed (e.g. "vault.seal", "encryption.encrypt"). */
  action: string;
  /** Outcome ("success" or "failure"). */
  outcome: string;
  /** User or service account that performed the action. */
  actorId?: string;
  /** IP address of the request. */
  ipAddress?: string;
  /** Target resource UUID (if applicable). */
  resourceId?: string;
  /** Additional context for the action. */
  metadata?: Record<string, unknown>;
  /** ISO 8601 timestamp. */
  createdAt: string;
}

/** Options for filtering audit log list requests. */
export interface AuditListOptions {
  /** Filter by action name. */
  action?: string;
  /** Filter by actor ID. */
  actorId?: string;
  /** ISO 8601 start date for range filter. */
  startDate?: string;
  /** ISO 8601 end date for range filter. */
  endDate?: string;
  /** Maximum number of entries to return. */
  limit?: number;
  /** Pagination offset. */
  offset?: number;
}

/** @internal */
function mapLog(d: Record<string, unknown>): AuditLog {
  return {
    id: d.id as string,
    action: d.action as string,
    outcome: d.outcome as string,
    actorId: d.actor_id as string | undefined,
    ipAddress: d.ip_address as string | undefined,
    resourceId: d.resource_id as string | undefined,
    metadata: d.metadata as Record<string, unknown> | undefined,
    createdAt: d.created_at as string,
  };
}

/**
 * Audit operations - list, get, and export audit log entries.
 *
 * @example
 * ```ts
 * const qs = new QuantaSeal({ apiKey: "qs_test_abc123" });
 * const logs = await qs.audit.list({ action: "vault.seal", limit: 50 });
 * const exported = await qs.audit.export("csv", "2024-01-01", "2024-12-31");
 * ```
 */
export class AuditResource {
  /** @internal */
  constructor(private readonly transport: Transport) {}

  /**
   * List audit log entries with optional filters.
   *
   * @param options - Optional filter and pagination parameters.
   * @returns Array of AuditLog entries.
   */
  async list(options: AuditListOptions = {}): Promise<AuditLog[]> {
    const params: Record<string, string> = {};
    if (options.action) params.action = options.action;
    if (options.actorId) params.actor_id = options.actorId;
    if (options.startDate) params.start_date = options.startDate;
    if (options.endDate) params.end_date = options.endDate;
    if (options.limit != null) params.limit = String(options.limit);
    if (options.offset != null) params.offset = String(options.offset);

    const resp = await this.transport.request<Record<string, unknown>[]>(
      "GET",
      "/api/v2/audit/logs",
      { params },
    );
    return (resp.data ?? []).map(mapLog);
  }

  /**
   * Retrieve a single audit log entry.
   *
   * @param logId - UUID of the audit log entry.
   * @returns AuditLog entry.
   */
  async get(logId: string): Promise<AuditLog> {
    const resp = await this.transport.request<Record<string, unknown>>(
      "GET",
      `/api/v2/audit/logs/${logId}`,
    );
    return mapLog(resp.data!);
  }

  /**
   * Export audit logs in the specified format.
   *
   * @param format - Export format (`"csv"` or `"json"`).
   * @param startDate - Optional ISO 8601 start date.
   * @param endDate - Optional ISO 8601 end date.
   * @returns Export content as a string (CSV or JSON).
   */
  async export(
    format: "csv" | "json",
    startDate?: string,
    endDate?: string,
  ): Promise<string> {
    const body: Record<string, unknown> = { format };
    if (startDate) body.start_date = startDate;
    if (endDate) body.end_date = endDate;

    const resp = await this.transport.request<{ content: string }>(
      "POST",
      "/api/v2/audit/export",
      { json: body },
    );
    return resp.data!.content;
  }
}
