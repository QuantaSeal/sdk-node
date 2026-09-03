/**
 * Security resource for API key management, integration revocation,
 * and emergency lockdown operations.
 */

import type { Transport } from "./transport.js";

/** An API key record (no secret value). */
export interface ApiKey {
  /** UUID of the API key. */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Permitted scopes. */
  scopes: string[];
  /** Key prefix (first 12 chars, safe to display). */
  keyPrefix?: string;
  /** Whether the key is currently active. */
  isActive: boolean;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /** ISO 8601 last-used timestamp. */
  lastUsedAt?: string | null;
}

/** Result of creating a new API key (includes the one-time secret value). */
export interface CreateApiKeyResult {
  /** The newly created ApiKey metadata. */
  key: ApiKey;
  /** Full API key value - shown only once. */
  secret: string;
}

/**
 * Security operations - API key management, integration revocation, lockdown.
 *
 * @example
 * ```ts
 * const qs = new QuantaSeal({ apiKey: "qs_test_abc123" });
 * const { secret } = await qs.security.createApiKey("CI pipeline", ["encrypt", "decrypt"]);
 * ```
 */
export class SecurityResource {
  /** @internal */
  constructor(private readonly transport: Transport) {}

  /**
   * Revoke an integration using its HMAC signature for verification.
   *
   * @param id - UUID of the integration to revoke.
   * @param hmac - HMAC-SHA-512 signature proving ownership.
   */
  async revokeIntegration(id: string, hmac: string): Promise<void> {
    await this.transport.requestRaw(
      "POST",
      `/api/v2/security/integrations/${id}/revoke`,
      { json: { hmac } },
    );
  }

  /**
   * List all API keys for the current tenant (no secret values).
   *
   * @returns Array of ApiKey metadata objects.
   */
  async listApiKeys(): Promise<ApiKey[]> {
    const resp = await this.transport.request<Array<{
      id: string;
      name: string;
      scopes: string[];
      key_prefix?: string;
      is_active: boolean;
      created_at: string;
      last_used_at?: string | null;
    }>>("GET", "/api/v2/security/api-keys");
    return (resp.data ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      scopes: d.scopes ?? [],
      keyPrefix: d.key_prefix,
      isActive: d.is_active,
      createdAt: d.created_at,
      lastUsedAt: d.last_used_at,
    }));
  }

  /**
   * Create a new API key.
   *
   * @param name - Human-readable name for the key.
   * @param scopes - List of permitted operation scopes.
   * @returns CreateApiKeyResult including the one-time secret value.
   */
  async createApiKey(
    name: string,
    scopes: string[],
  ): Promise<CreateApiKeyResult> {
    const resp = await this.transport.request<{
      key: {
        id: string;
        name: string;
        scopes: string[];
        key_prefix?: string;
        is_active: boolean;
        created_at: string;
        last_used_at?: string | null;
      };
      secret: string;
    }>("POST", "/api/v2/security/api-keys", { json: { name, scopes } });
    const d = resp.data!;
    return {
      key: {
        id: d.key.id,
        name: d.key.name,
        scopes: d.key.scopes ?? [],
        keyPrefix: d.key.key_prefix,
        isActive: d.key.is_active,
        createdAt: d.key.created_at,
        lastUsedAt: d.key.last_used_at,
      },
      secret: d.secret,
    };
  }

  /**
   * Revoke (deactivate) an API key permanently.
   *
   * @param id - UUID of the API key to revoke.
   */
  async revokeApiKey(id: string): Promise<void> {
    await this.transport.requestRaw("DELETE", `/api/v2/security/api-keys/${id}`);
  }

  /**
   * Trigger an emergency lockdown - disables all integrations and API
   * access for the tenant until manually unlocked.
   *
   * @param reason - Reason for initiating the lockdown (for audit trail).
   */
  async emergencyLockdown(reason: string): Promise<void> {
    await this.transport.requestRaw("POST", "/api/v2/security/emergency-lockdown", {
      json: { reason },
    });
  }
}
