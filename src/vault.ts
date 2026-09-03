/**
 * Vault resource for credential lifecycle management.
 *
 * Provides seal (encrypt + store), unseal (decrypt + retrieve), rotate,
 * list, and delete operations for the QuantaSeal PQC credential vault.
 */

import type {
  VaultEntry,
  VaultRotateResult,
  VaultUnsealResult,
} from "./models.js";
import type { Transport } from "./transport.js";

/** @internal Raw API response for seal - returns just the entry UUID string. */
type RawSealData = string;

/** @internal Raw API response for unseal. */
interface RawUnsealData {
  plaintext: Record<string, unknown>;
  last_accessed_at?: string | null;
}

/** @internal Raw API response for rotate. */
interface RawRotateData {
  new_entry_id: string;
  old_entry_id: string;
}

/** @internal Raw API response for list - array of entries. */
interface RawVaultEntryData {
  id: string;
  name: string;
  credential_type: string;
  algorithm: string;
  is_active: boolean;
  created_at: string;
  last_accessed_at?: string | null;
  ttl_expires_at?: string | null;
}

/**
 * Vault operations - seal, unseal, rotate, list, delete.
 *
 * @example
 * ```ts
 * const qs = new QuantaSeal({ apiKey: "qs_test_abc123" });
 *
 * // Store a credential
 * const id = await qs.vault.seal({
 *   name: "aws-prod-keys",
 *   credentialType: "api_key",
 *   plaintext: { access_key: "AKIA...", secret_key: "wJal..." },
 *   ttlDays: 90,
 * });
 *
 * // Retrieve
 * const result = await qs.vault.unseal(id);
 * console.log(result.plaintext);
 *
 * // List all entries (metadata only - no plaintext)
 * const entries = await qs.vault.list();
 *
 * // Rotate encryption keys
 * const rotated = await qs.vault.rotate(id);
 *
 * // Soft-delete
 * await qs.vault.delete(id);
 * ```
 */
export class Vault {
  /** @internal */
  constructor(private readonly transport: Transport) {}

  /**
   * Seal (encrypt and store) a credential in the vault.
   *
   * @param params.name - Human-readable name for the credential.
   * @param params.credentialType - Type: `"api_key"`, `"password"`, `"certificate"`,
   *   `"ssh_key"`, `"oauth_token"`, `"database"`, `"generic"`.
   * @param params.plaintext - Credential data as a plain object.
   * @param params.ttlDays - Optional time-to-live in days (1–365). Omit for no expiry.
   * @param params.metadata - Optional metadata dictionary.
   * @returns UUID string of the sealed vault entry.
   */
  async seal(params: {
    name: string;
    credentialType: string;
    plaintext: Record<string, unknown>;
    ttlDays?: number;
    metadata?: Record<string, unknown>;
  }): Promise<string> {
    const body: Record<string, unknown> = {
      name: params.name,
      credential_type: params.credentialType,
      plaintext: params.plaintext,
    };
    if (params.ttlDays != null) {
      body.ttl_days = params.ttlDays;
    }
    if (params.metadata != null) {
      body.metadata = params.metadata;
    }

    const resp = await this.transport.request<RawSealData>(
      "POST",
      "/api/v2/vault/seal",
      { json: body },
    );
    return String(resp.data);
  }

  /**
   * Unseal (decrypt and retrieve) a credential from the vault.
   *
   * @param entryId - UUID of the vault entry to unseal.
   * @returns VaultUnsealResult with decrypted plaintext.
   * @throws {NotFoundError} If the entry does not exist.
   * @throws {VaultError} If the entry has expired (410 Gone).
   */
  async unseal(entryId: string): Promise<VaultUnsealResult> {
    const resp = await this.transport.request<RawUnsealData>(
      "POST",
      `/api/v2/vault/unseal/${entryId}`,
    );
    const data = resp.data!;
    const meta = resp.meta ?? {};
    return {
      plaintext: data.plaintext ?? {},
      lastAccessedAt: data.last_accessed_at,
      requestId: meta.request_id as string | undefined,
    };
  }

  /**
   * Rotate encryption keys for a vault entry.
   *
   * The credential is decrypted with the current keys and re-encrypted
   * with fresh keys. The old entry becomes inactive.
   *
   * @param entryId - UUID of the vault entry to rotate.
   * @returns VaultRotateResult with old and new entry IDs.
   */
  async rotate(entryId: string): Promise<VaultRotateResult> {
    const resp = await this.transport.request<RawRotateData>(
      "POST",
      `/api/v2/vault/rotate/${entryId}`,
    );
    const data = resp.data!;
    const meta = resp.meta ?? {};
    return {
      newEntryId: data.new_entry_id ?? "",
      oldEntryId: data.old_entry_id ?? "",
      requestId: meta.request_id as string | undefined,
    };
  }

  /**
   * List all vault entries (metadata only - no plaintext).
   *
   * @param options.includeInactive - Include soft-deleted entries (default `false`).
   * @returns Array of VaultEntry metadata objects.
   */
  async list(
    options: { includeInactive?: boolean } = {},
  ): Promise<VaultEntry[]> {
    const params: Record<string, string> = {};
    if (options.includeInactive) {
      params.include_inactive = "true";
    }

    const resp = await this.transport.request<RawVaultEntryData[]>(
      "GET",
      "/api/v2/vault/entries",
      { params },
    );

    const entries = resp.data ?? [];
    return entries.map((e) => ({
      id: e.id,
      name: e.name,
      credentialType: e.credential_type,
      algorithm: e.algorithm,
      isActive: e.is_active,
      createdAt: e.created_at,
      lastAccessedAt: e.last_accessed_at,
      ttlExpiresAt: e.ttl_expires_at,
    }));
  }

  /**
   * Soft-delete a vault entry.
   *
   * @param entryId - UUID of the vault entry to delete.
   * @throws {NotFoundError} If the entry does not exist.
   */
  async delete(entryId: string): Promise<void> {
    await this.transport.requestRaw(
      "DELETE",
      `/api/v2/vault/entries/${entryId}`,
    );
  }
}
