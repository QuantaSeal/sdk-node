/**
 * Webhooks resource for managing webhook subscriptions and delivery history.
 *
 * QuantaSeal sends signed webhook events for audit log entries,
 * vault changes, compliance alerts, and more.
 */

import type { Transport } from "./transport.js";

/** A webhook subscription. */
export interface Webhook {
  /** UUID of the webhook. */
  id: string;
  /** Target URL. */
  url: string;
  /** List of event types subscribed to. */
  events: string[];
  /** Whether the webhook is active. */
  isActive: boolean;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
}

/** A webhook delivery attempt record. */
export interface WebhookDelivery {
  /** UUID of the delivery attempt. */
  id: string;
  /** UUID of the parent webhook. */
  webhookId: string;
  /** Event type. */
  eventType: string;
  /** HTTP status code returned by the target. */
  responseStatus?: number;
  /** Whether the delivery succeeded. */
  success: boolean;
  /** ISO 8601 delivery timestamp. */
  deliveredAt: string;
  /** Number of retry attempts. */
  attempts: number;
}

/** @internal */
function mapWebhook(d: Record<string, unknown>): Webhook {
  return {
    id: d.id as string,
    url: d.url as string,
    events: (d.events as string[]) ?? [],
    isActive: d.is_active as boolean,
    createdAt: d.created_at as string,
  };
}

/**
 * Webhook operations - create, list, get, delete, test, and list deliveries.
 *
 * @example
 * ```ts
 * const qs = new QuantaSeal({ apiKey: "qs_test_abc123" });
 * const wh = await qs.webhooks.create("https://myapp.com/hook", ["vault.seal", "audit.log"], "secret");
 * await qs.webhooks.test(wh.id);
 * ```
 */
export class WebhooksResource {
  /** @internal */
  constructor(private readonly transport: Transport) {}

  /**
   * Create a new webhook subscription.
   *
   * @param url - Target URL to POST events to.
   * @param events - List of event types to subscribe to.
   * @param secret - Signing secret for HMAC verification of deliveries.
   * @returns The created Webhook.
   */
  async create(
    url: string,
    events: string[],
    secret: string,
  ): Promise<Webhook> {
    const resp = await this.transport.request<Record<string, unknown>>(
      "POST",
      "/api/v2/webhooks",
      { json: { url, events, secret } },
    );
    return mapWebhook(resp.data!);
  }

  /**
   * List all webhook subscriptions for the current tenant.
   *
   * @returns Array of Webhook objects.
   */
  async list(): Promise<Webhook[]> {
    const resp = await this.transport.request<Record<string, unknown>[]>(
      "GET",
      "/api/v2/webhooks",
    );
    return (resp.data ?? []).map(mapWebhook);
  }

  /**
   * Retrieve a single webhook subscription.
   *
   * @param id - UUID of the webhook.
   * @returns Webhook object.
   */
  async get(id: string): Promise<Webhook> {
    const resp = await this.transport.request<Record<string, unknown>>(
      "GET",
      `/api/v2/webhooks/${id}`,
    );
    return mapWebhook(resp.data!);
  }

  /**
   * Delete a webhook subscription.
   *
   * @param id - UUID of the webhook to delete.
   */
  async delete(id: string): Promise<void> {
    await this.transport.requestRaw("DELETE", `/api/v2/webhooks/${id}`);
  }

  /**
   * Send a test event to the webhook target URL.
   *
   * @param id - UUID of the webhook to test.
   * @returns Object with success flag and HTTP status returned by the target.
   */
  async test(id: string): Promise<{ success: boolean; responseStatus?: number }> {
    const resp = await this.transport.request<{
      success: boolean;
      response_status?: number;
    }>("POST", `/api/v2/webhooks/${id}/test`);
    const d = resp.data!;
    return { success: d.success, responseStatus: d.response_status };
  }

  /**
   * List delivery attempts for a webhook.
   *
   * @param id - UUID of the webhook.
   * @returns Array of WebhookDelivery records (most recent first).
   */
  async listDeliveries(id: string): Promise<WebhookDelivery[]> {
    const resp = await this.transport.request<Array<{
      id: string;
      webhook_id: string;
      event_type: string;
      response_status?: number;
      success: boolean;
      delivered_at: string;
      attempts: number;
    }>>("GET", `/api/v2/webhooks/${id}/deliveries`);
    return (resp.data ?? []).map((d) => ({
      id: d.id,
      webhookId: d.webhook_id,
      eventType: d.event_type,
      responseStatus: d.response_status,
      success: d.success,
      deliveredAt: d.delivered_at,
      attempts: d.attempts,
    }));
  }
}
