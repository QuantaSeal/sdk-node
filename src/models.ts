/**
 * TypeScript interfaces for QuantaSeal API request/response types.
 *
 * These mirror the Python SDK's Pydantic models for full API parity.
 */

// ─────────────────────────────────────────────────────────────────────────────
// API response envelope
// ─────────────────────────────────────────────────────────────────────────────

/** Standard QuantaSeal API response wrapper. */
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { message?: string; code?: string; details?: Record<string, unknown> };
  meta: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Encryption / Decryption
// ─────────────────────────────────────────────────────────────────────────────

/** Result of an encryption operation. */
export interface EncryptResult {
  /** Base64-encoded ciphertext. */
  ciphertext: string;
  /** Algorithm, key ID, nonce information. */
  encryptionMetadata: Record<string, unknown>;
  /** Base64-encoded ML-DSA-65 signature over the ciphertext. */
  signature: string;
  /** Complete HybridCryptoEnvelope for decryption. */
  envelope: Record<string, unknown>;
  /** Unique request identifier for audit trail. */
  requestId?: string;
  /** Encryption algorithm used. */
  readonly algorithm: string;
  /** Key ID used for encryption. */
  readonly keyId?: string;
}

/** Result of a decryption operation. */
export interface DecryptResult {
  /** Base64-encoded decrypted plaintext. */
  plaintext: string;
  /** Whether the signature was verified. */
  signatureValid: boolean;
  /** Metadata from the envelope. */
  encryptionMetadata: Record<string, unknown>;
  /** Unique request identifier for audit trail. */
  requestId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Digital Signatures
// ─────────────────────────────────────────────────────────────────────────────

/** Result of a digital signature operation. */
export interface SignResult {
  /** Base64-encoded ML-DSA-65 signature. */
  signature: string;
  /** Base64-encoded HMAC-SHA-512 signature. */
  hmacSignature: string;
  /** Base64-encoded public key for verification. */
  publicKey: string;
  /** Algorithm used for signing. */
  algorithm: string;
  /** Unique request identifier for audit trail. */
  requestId?: string;
}

/** Result of a signature verification operation. */
export interface VerifyResult {
  /** Overall verification result. */
  valid: boolean;
  /** Whether the ML-DSA-65 signature is valid. */
  pqcValid: boolean;
  /** Whether the HMAC-SHA-512 signature is valid. */
  hmacValid: boolean;
  /** Algorithm used for verification. */
  algorithm: string;
  /** Additional verification context. */
  verificationMetadata: Record<string, unknown>;
  /** Unique request identifier for audit trail. */
  requestId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Vault
// ─────────────────────────────────────────────────────────────────────────────

/** Vault entry metadata (no plaintext). */
export interface VaultEntry {
  /** UUID of the vault entry. */
  id: string;
  /** Human-readable credential name. */
  name: string;
  /** Type of credential (api_key, password, certificate, etc.). */
  credentialType: string;
  /** Encryption algorithm used. */
  algorithm: string;
  /** Whether the entry is active (not deleted). */
  isActive: boolean;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /** ISO 8601 timestamp of last access (if any). */
  lastAccessedAt?: string | null;
  /** ISO 8601 TTL expiration timestamp (if set). */
  ttlExpiresAt?: string | null;
}

/** Result of unsealing a vault entry. */
export interface VaultUnsealResult {
  /** Decrypted credential data. */
  plaintext: Record<string, unknown>;
  /** ISO 8601 timestamp of last access. */
  lastAccessedAt?: string | null;
  /** Unique request identifier for audit trail. */
  requestId?: string;
}

/** Result of rotating a vault entry's encryption keys. */
export interface VaultRotateResult {
  /** UUID of the new entry (re-encrypted with fresh keys). */
  newEntryId: string;
  /** UUID of the old entry (now inactive). */
  oldEntryId: string;
  /** Unique request identifier for audit trail. */
  requestId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Client options
// ─────────────────────────────────────────────────────────────────────────────

/** Configuration options for the QuantaSeal client. */
export interface QuantaSealOptions {
  /**
   * API key (`qs_live_...` or `qs_test_...`).
   * Falls back to the `QUANTASHIELD_API_KEY` environment variable.
   */
  apiKey?: string;
  /**
   * API base URL.
   * Falls back to `QUANTASHIELD_BASE_URL` or `https://api.quantaseal.io`.
   */
  baseUrl?: string;
  /** Request timeout in milliseconds (default 30 000). */
  timeout?: number;
  /** Maximum retry attempts for transient failures (default 3). */
  maxRetries?: number;
  /** Additional HTTP headers to send with every request. */
  headers?: Record<string, string>;
}
