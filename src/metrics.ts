/**
 * Metrics resource for retrieving usage statistics, encryption stats,
 * API call metrics, and vault statistics.
 */

import type { Transport } from "./transport.js";

/** General usage metrics for a period. */
export interface UsageMetrics {
  /** Total API calls in the period. */
  apiCalls: number;
  /** Total encryption operations. */
  encryptionOps: number;
  /** Total decryption operations. */
  decryptionOps: number;
  /** Total signing operations. */
  signOps: number;
  /** Total verification operations. */
  verifyOps: number;
  /** Period identifier (e.g. "7d", "30d", "90d"). */
  period: string;
}

/** Encryption algorithm and key usage statistics. */
export interface EncryptionStats {
  /** Breakdown by algorithm. */
  byAlgorithm: Record<string, number>;
  /** Total keys generated. */
  keysGenerated: number;
  /** Total keys rotated. */
  keysRotated: number;
  /** Average encryption latency in milliseconds. */
  avgLatencyMs?: number;
}

/** API call statistics. */
export interface ApiStats {
  /** Total requests. */
  totalRequests: number;
  /** Successful requests (2xx). */
  successfulRequests: number;
  /** Failed requests (4xx + 5xx). */
  failedRequests: number;
  /** Average response time in milliseconds. */
  avgResponseTimeMs?: number;
  /** Requests broken down by endpoint prefix. */
  byEndpoint?: Record<string, number>;
  /** Period identifier. */
  period: string;
}

/** Vault storage statistics. */
export interface VaultStats {
  /** Total entries currently stored. */
  totalEntries: number;
  /** Active (non-deleted) entries. */
  activeEntries: number;
  /** Entries expiring within 7 days. */
  expiringEntries: number;
  /** Breakdown by credential type. */
  byCredentialType?: Record<string, number>;
}

/**
 * Metrics operations - usage, encryption, API, and vault statistics.
 *
 * @example
 * ```ts
 * const qs = new QuantaSeal({ apiKey: "qs_test_abc123" });
 * const usage = await qs.metrics.getUsage("30d");
 * const enc   = await qs.metrics.getEncryptionStats();
 * ```
 */
export class MetricsResource {
  /** @internal */
  constructor(private readonly transport: Transport) {}

  /**
   * Get usage metrics for a time period.
   *
   * @param period - Period identifier ("7d", "30d", "90d"; default `"30d"`).
   * @returns UsageMetrics for the specified period.
   */
  async getUsage(period = "30d"): Promise<UsageMetrics> {
    const resp = await this.transport.request<{
      api_calls: number;
      encryption_ops: number;
      decryption_ops: number;
      sign_ops: number;
      verify_ops: number;
      period: string;
    }>("GET", "/api/v2/metrics/usage", { params: { period } });
    const d = resp.data!;
    return {
      apiCalls: d.api_calls,
      encryptionOps: d.encryption_ops,
      decryptionOps: d.decryption_ops,
      signOps: d.sign_ops,
      verifyOps: d.verify_ops,
      period: d.period,
    };
  }

  /**
   * Get encryption algorithm and key usage statistics.
   *
   * @returns EncryptionStats breakdown.
   */
  async getEncryptionStats(): Promise<EncryptionStats> {
    const resp = await this.transport.request<{
      by_algorithm: Record<string, number>;
      keys_generated: number;
      keys_rotated: number;
      avg_latency_ms?: number;
    }>("GET", "/api/v2/metrics/encryption");
    const d = resp.data!;
    return {
      byAlgorithm: d.by_algorithm ?? {},
      keysGenerated: d.keys_generated,
      keysRotated: d.keys_rotated,
      avgLatencyMs: d.avg_latency_ms,
    };
  }

  /**
   * Get API call statistics for a time period.
   *
   * @param period - Period identifier (default `"30d"`).
   * @returns ApiStats for the specified period.
   */
  async getApiStats(period = "30d"): Promise<ApiStats> {
    const resp = await this.transport.request<{
      total_requests: number;
      successful_requests: number;
      failed_requests: number;
      avg_response_time_ms?: number;
      by_endpoint?: Record<string, number>;
      period: string;
    }>("GET", "/api/v2/metrics/api", { params: { period } });
    const d = resp.data!;
    return {
      totalRequests: d.total_requests,
      successfulRequests: d.successful_requests,
      failedRequests: d.failed_requests,
      avgResponseTimeMs: d.avg_response_time_ms,
      byEndpoint: d.by_endpoint,
      period: d.period,
    };
  }

  /**
   * Get vault storage and entry statistics.
   *
   * @returns VaultStats summary.
   */
  async getVaultStats(): Promise<VaultStats> {
    const resp = await this.transport.request<{
      total_entries: number;
      active_entries: number;
      expiring_entries: number;
      by_credential_type?: Record<string, number>;
    }>("GET", "/api/v2/metrics/vault");
    const d = resp.data!;
    return {
      totalEntries: d.total_entries,
      activeEntries: d.active_entries,
      expiringEntries: d.expiring_entries,
      byCredentialType: d.by_credential_type,
    };
  }
}
