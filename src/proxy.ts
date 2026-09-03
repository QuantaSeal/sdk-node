/**
 * Proxy resource for managing external system integrations and forwarding
 * requests through QuantaSeal's encrypted proxy layer.
 */

import type { Transport } from "./transport.js";

/** An external system integration. */
export interface Integration {
  /** UUID of the integration. */
  id: string;
  /** Human-readable name. */
  name: string;
  /** System type (e.g. "salesforce", "hubspot", "generic_rest"). */
  systemType: string;
  /** Integration configuration. */
  config: Record<string, unknown>;
  /** Target endpoint URL. */
  endpointUrl?: string;
  /** Permitted operations. */
  allowedOperations?: string[];
  /** Whether the integration is active. */
  isActive: boolean;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
}

/** @internal */
interface RawIntegration {
  id: string;
  name: string;
  system_type: string;
  config: Record<string, unknown>;
  endpoint_url?: string;
  allowed_operations?: string[];
  is_active: boolean;
  created_at: string;
}

/** Result of a forwarded request. */
export interface ForwardResult {
  /** HTTP status code returned by the upstream system. */
  statusCode: number;
  /** Response body from the upstream system. */
  body: unknown;
  /** Response headers from the upstream system. */
  headers?: Record<string, string>;
}

/** @internal */
function mapIntegration(raw: RawIntegration): Integration {
  return {
    id: raw.id,
    name: raw.name,
    systemType: raw.system_type,
    config: raw.config ?? {},
    endpointUrl: raw.endpoint_url,
    allowedOperations: raw.allowed_operations,
    isActive: raw.is_active,
    createdAt: raw.created_at,
  };
}

/**
 * Proxy operations - manage integrations and forward requests.
 *
 * @example
 * ```ts
 * const qs = new QuantaSeal({ apiKey: "qs_test_abc123" });
 * const integration = await qs.proxy.createIntegration(
 *   "My Salesforce",
 *   "salesforce",
 *   { instance_url: "https://myorg.salesforce.com" },
 * );
 * const result = await qs.proxy.forward(integration.id, "GET", "/sobjects/Account");
 * ```
 */
export class ProxyResource {
  /** @internal */
  constructor(private readonly transport: Transport) {}

  /**
   * Create a new external system integration.
   *
   * @param name - Human-readable name for the integration.
   * @param systemType - Target system type identifier.
   * @param config - System-specific configuration (credentials, settings).
   * @param options.endpointUrl - Base URL to forward requests to.
   * @param options.allowedOperations - Whitelist of allowed HTTP methods/operations.
   * @returns The newly created Integration.
   */
  async createIntegration(
    name: string,
    systemType: string,
    config: Record<string, unknown>,
    options: { endpointUrl?: string; allowedOperations?: string[] } = {},
  ): Promise<Integration> {
    const body: Record<string, unknown> = { name, system_type: systemType, config };
    if (options.endpointUrl != null) body.endpoint_url = options.endpointUrl;
    if (options.allowedOperations != null) body.allowed_operations = options.allowedOperations;

    const resp = await this.transport.request<RawIntegration>(
      "POST",
      "/api/v2/proxy/integrations",
      { json: body },
    );
    return mapIntegration(resp.data!);
  }

  /**
   * List all active integrations for the current tenant.
   *
   * @returns Array of Integration objects.
   */
  async listIntegrations(): Promise<Integration[]> {
    const resp = await this.transport.request<RawIntegration[]>(
      "GET",
      "/api/v2/proxy/integrations",
    );
    return (resp.data ?? []).map(mapIntegration);
  }

  /**
   * Retrieve a single integration by ID.
   *
   * @param integrationId - UUID of the integration.
   * @returns Integration object.
   */
  async getIntegration(integrationId: string): Promise<Integration> {
    const resp = await this.transport.request<RawIntegration>(
      "GET",
      `/api/v2/proxy/integrations/${integrationId}`,
    );
    return mapIntegration(resp.data!);
  }

  /**
   * Delete an integration.
   *
   * @param integrationId - UUID of the integration to delete.
   */
  async deleteIntegration(integrationId: string): Promise<void> {
    await this.transport.requestRaw(
      "DELETE",
      `/api/v2/proxy/integrations/${integrationId}`,
    );
  }

  /**
   * Test connectivity to an integration's upstream system.
   *
   * @param integrationId - UUID of the integration to test.
   * @returns Object with connected status and optional latency.
   */
  async testConnectivity(
    integrationId: string,
  ): Promise<{ connected: boolean; latencyMs?: number }> {
    const resp = await this.transport.request<{
      connected: boolean;
      latency_ms?: number;
    }>("POST", `/api/v2/proxy/integrations/${integrationId}/test`);
    const data = resp.data!;
    return { connected: data.connected, latencyMs: data.latency_ms };
  }

  /**
   * Forward a request through the proxy to the upstream system.
   *
   * @param integrationId - UUID of the integration to route through.
   * @param method - HTTP method (GET, POST, PUT, PATCH, DELETE, etc.).
   * @param endpoint - Relative path on the upstream system.
   * @param payload - Optional request body.
   * @param headers - Optional additional headers to forward.
   * @returns ForwardResult with upstream status code and body.
   */
  async forward(
    integrationId: string,
    method: string,
    endpoint: string,
    payload?: unknown,
    headers?: Record<string, string>,
  ): Promise<ForwardResult> {
    const body: Record<string, unknown> = {
      integration_id: integrationId,
      method,
      endpoint,
    };
    if (payload != null) body.payload = payload;
    if (headers != null) body.headers = headers;

    const resp = await this.transport.request<{
      status_code: number;
      body: unknown;
      headers?: Record<string, string>;
    }>("POST", "/api/v2/proxy/forward", { json: body });

    const data = resp.data!;
    return {
      statusCode: data.status_code,
      body: data.body,
      headers: data.headers,
    };
  }
}
