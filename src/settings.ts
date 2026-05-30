/**
 * Settings resource for managing tenant-level configuration,
 * API key listing, and signing key rotation.
 */

import type { Transport } from "./transport.js";

/** Tenant settings object. */
export interface TenantSettings {
  /** Tenant UUID. */
  tenantId: string;
  /** Organisation name. */
  orgName?: string;
  /** Default encryption algorithm. */
  defaultAlgorithm?: string;
  /** Whether MFA is enforced for all users. */
  mfaEnforced?: boolean;
  /** Data retention period in days. */
  retentionDays?: number;
  /** Allowed IP ranges for API access. */
  allowedIpRanges?: string[];
  /** Additional settings key-value pairs. */
  extra?: Record<string, unknown>;
}

/** An API key record (without secret). */
export interface SettingsApiKey {
  /** UUID of the API key. */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Permitted scopes. */
  scopes: string[];
  /** Truncated key prefix for display. */
  keyPrefix?: string;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
}

/**
 * Settings operations - get, update, list API keys, rotate signing key.
 *
 * @example
 * ```ts
 * const qs = new QuantaSeal({ apiKey: "qs_test_abc123" });
 * const settings = await qs.settings.get();
 * await qs.settings.update({ defaultAlgorithm: "ML-KEM-1024" });
 * ```
 */
export class SettingsResource {
  /** @internal */
  constructor(private readonly transport: Transport) {}

  /**
   * Get current tenant settings.
   *
   * @returns TenantSettings object.
   */
  async get(): Promise<TenantSettings> {
    const resp = await this.transport.request<{
      tenant_id: string;
      org_name?: string;
      default_algorithm?: string;
      mfa_enforced?: boolean;
      retention_days?: number;
      allowed_ip_ranges?: string[];
      [key: string]: unknown;
    }>("GET", "/api/v2/settings");
    const d = resp.data!;
    const { tenant_id, org_name, default_algorithm, mfa_enforced, retention_days, allowed_ip_ranges, ...rest } = d;
    return {
      tenantId: tenant_id,
      orgName: org_name,
      defaultAlgorithm: default_algorithm,
      mfaEnforced: mfa_enforced,
      retentionDays: retention_days,
      allowedIpRanges: allowed_ip_ranges,
      extra: rest as Record<string, unknown>,
    };
  }

  /**
   * Update tenant settings.
   *
   * @param updates - Partial settings to update.
   * @returns Updated TenantSettings.
   */
  async update(updates: Partial<TenantSettings>): Promise<TenantSettings> {
    const body: Record<string, unknown> = {};
    if (updates.orgName != null) body.org_name = updates.orgName;
    if (updates.defaultAlgorithm != null) body.default_algorithm = updates.defaultAlgorithm;
    if (updates.mfaEnforced != null) body.mfa_enforced = updates.mfaEnforced;
    if (updates.retentionDays != null) body.retention_days = updates.retentionDays;
    if (updates.allowedIpRanges != null) body.allowed_ip_ranges = updates.allowedIpRanges;
    if (updates.extra != null) Object.assign(body, updates.extra);

    const resp = await this.transport.request<{
      tenant_id: string;
      org_name?: string;
      default_algorithm?: string;
      mfa_enforced?: boolean;
      retention_days?: number;
      allowed_ip_ranges?: string[];
      [key: string]: unknown;
    }>("PATCH", "/api/v2/settings", { json: body });
    const d = resp.data!;
    const { tenant_id, org_name, default_algorithm, mfa_enforced, retention_days, allowed_ip_ranges, ...rest } = d;
    return {
      tenantId: tenant_id,
      orgName: org_name,
      defaultAlgorithm: default_algorithm,
      mfaEnforced: mfa_enforced,
      retentionDays: retention_days,
      allowedIpRanges: allowed_ip_ranges,
      extra: rest as Record<string, unknown>,
    };
  }

  /**
   * List all API keys for the current tenant.
   *
   * @returns Array of SettingsApiKey metadata objects.
   */
  async getApiKeys(): Promise<SettingsApiKey[]> {
    const resp = await this.transport.request<Array<{
      id: string;
      name: string;
      scopes: string[];
      key_prefix?: string;
      created_at: string;
    }>>("GET", "/api/v2/settings/api-keys");
    return (resp.data ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      scopes: d.scopes ?? [],
      keyPrefix: d.key_prefix,
      createdAt: d.created_at,
    }));
  }

  /**
   * Rotate the tenant's HMAC signing key.
   *
   * All existing HMAC signatures become invalid after rotation.
   *
   * @returns Object with the new signing key (shown only once).
   */
  async rotateSigningKey(): Promise<{ signingKey: string }> {
    const resp = await this.transport.request<{ signing_key: string }>(
      "POST",
      "/api/v2/settings/rotate-signing-key",
    );
    return { signingKey: resp.data!.signing_key };
  }
}
