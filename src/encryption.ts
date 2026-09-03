/**
 * Encryption resource for quantum-safe encrypt/decrypt/sign/verify operations.
 *
 * Uses ML-KEM-768 + AES-256-GCM for encryption and ML-DSA-65 for digital
 * signatures. All cryptographic operations happen server-side - the SDK
 * handles base64 encoding/decoding and envelope management.
 */

import type {
  DecryptResult,
  EncryptResult,
  SignResult,
  VerifyResult,
} from "./models.js";
import type { Transport } from "./transport.js";

/** @internal Raw API response shape for the encrypt endpoint. */
interface RawEncryptData {
  ciphertext: string;
  encryption_metadata: Record<string, unknown>;
  signature: string;
  envelope: Record<string, unknown>;
}

/** @internal Raw API response shape for the decrypt endpoint. */
interface RawDecryptData {
  plaintext: string;
  signature_valid: boolean;
  encryption_metadata: Record<string, unknown>;
}

/** @internal Raw API response shape for the sign endpoint. */
interface RawSignData {
  signature: string;
  hmac_signature: string;
  public_key: string;
  algorithm: string;
}

/** @internal Raw API response shape for the verify endpoint. */
interface RawVerifyData {
  valid: boolean;
  pqc_valid: boolean;
  hmac_valid: boolean;
  algorithm: string;
  verification_metadata?: Record<string, unknown>;
}

/**
 * Encryption operations - encrypt, decrypt, sign, verify.
 *
 * @example
 * ```ts
 * const qs = new QuantaSeal({ apiKey: "qs_test_abc123" });
 *
 * // Encrypt raw data
 * const result = await qs.encrypt(Buffer.from("hello world"));
 *
 * // Decrypt
 * const decrypted = await qs.decrypt(result.envelope);
 *
 * // Sign
 * const signed = await qs.sign(Buffer.from("document"));
 *
 * // Verify
 * const verified = await qs.verify({
 *   data: Buffer.from("document"),
 *   signature: signed.signature,
 *   hmacSignature: signed.hmacSignature,
 *   publicKey: signed.publicKey,
 * });
 * ```
 */
export class Encryption {
  /** @internal */
  constructor(private readonly transport: Transport) {}

  /**
   * Encrypt data using ML-KEM-768 + AES-256-GCM + ML-DSA-65.
   *
   * @param plaintext - Raw data to encrypt (Buffer or Uint8Array).
   * @param options.algorithm - Encryption algorithm (default `"ML-KEM-768"`).
   * @param options.encryptionContext - Optional AAD for authenticated encryption.
   * @returns EncryptResult with ciphertext, signature, and envelope.
   */
  async encrypt(
    plaintext: Buffer | Uint8Array,
    options: {
      algorithm?: string;
      encryptionContext?: Record<string, unknown>;
    } = {},
  ): Promise<EncryptResult> {
    const body: Record<string, unknown> = {
      plaintext: Buffer.from(plaintext).toString("base64"),
      algorithm: options.algorithm ?? "ML-KEM-768",
    };
    if (options.encryptionContext) {
      body.encryption_context = options.encryptionContext;
    }

    const resp = await this.transport.request<RawEncryptData>(
      "POST",
      "/api/v2/encryption/encrypt",
      { json: body },
    );

    const data = resp.data!;
    const meta = resp.meta ?? {};
    return {
      ciphertext: data.ciphertext,
      encryptionMetadata: data.encryption_metadata,
      signature: data.signature,
      envelope: data.envelope,
      requestId: meta.request_id as string | undefined,
      get algorithm() {
        return (
          (data.encryption_metadata.algorithm as string) ?? "ML-KEM-768"
        );
      },
      get keyId() {
        return data.encryption_metadata.key_id as string | undefined;
      },
    };
  }

  /**
   * Decrypt data using a HybridCryptoEnvelope.
   *
   * @param envelope - Complete envelope from a previous `encrypt()` call.
   * @param options.verifySignature - Verify signature before decryption (default `true`).
   * @returns DecryptResult with base64-encoded plaintext.
   */
  async decrypt(
    envelope: Record<string, unknown>,
    options: { verifySignature?: boolean } = {},
  ): Promise<DecryptResult> {
    const body: Record<string, unknown> = {
      envelope,
      verify_signature: options.verifySignature ?? true,
    };

    const resp = await this.transport.request<RawDecryptData>(
      "POST",
      "/api/v2/encryption/decrypt",
      { json: body },
    );

    const data = resp.data!;
    const meta = resp.meta ?? {};
    return {
      plaintext: data.plaintext,
      signatureValid: data.signature_valid,
      encryptionMetadata: data.encryption_metadata,
      requestId: meta.request_id as string | undefined,
    };
  }

  /**
   * Sign data with ML-DSA-65 + HMAC-SHA-512.
   *
   * @param data - Raw data to sign (Buffer or Uint8Array).
   * @param options.algorithm - Signature algorithm (default `"ML-DSA-65"`).
   * @returns SignResult with signatures and public key.
   */
  async sign(
    data: Buffer | Uint8Array,
    options: { algorithm?: string } = {},
  ): Promise<SignResult> {
    const body: Record<string, unknown> = {
      data: Buffer.from(data).toString("base64"),
      algorithm: options.algorithm ?? "ML-DSA-65",
    };

    const resp = await this.transport.request<RawSignData>(
      "POST",
      "/api/v2/encryption/sign",
      { json: body },
    );

    const d = resp.data!;
    const meta = resp.meta ?? {};
    return {
      signature: d.signature,
      hmacSignature: d.hmac_signature,
      publicKey: d.public_key,
      algorithm: d.algorithm,
      requestId: meta.request_id as string | undefined,
    };
  }

  /**
   * Verify an ML-DSA-65 + HMAC-SHA-512 signature.
   *
   * @param params.data - Original data that was signed (Buffer or Uint8Array).
   * @param params.signature - Base64-encoded ML-DSA-65 signature.
   * @param params.hmacSignature - Base64-encoded HMAC-SHA-512 signature.
   * @param params.publicKey - Base64-encoded public key.
   * @param params.hmacSecret - Optional HMAC secret (uses tenant key if omitted).
   * @returns VerifyResult with per-algorithm validity flags.
   */
  async verify(params: {
    data: Buffer | Uint8Array;
    signature: string;
    hmacSignature: string;
    publicKey: string;
    hmacSecret?: string;
  }): Promise<VerifyResult> {
    const body: Record<string, unknown> = {
      data: Buffer.from(params.data).toString("base64"),
      signature: params.signature,
      hmac_signature: params.hmacSignature,
      public_key: params.publicKey,
    };
    if (params.hmacSecret) {
      body.hmac_secret = params.hmacSecret;
    }

    const resp = await this.transport.request<RawVerifyData>(
      "POST",
      "/api/v2/encryption/verify",
      { json: body },
    );

    const d = resp.data!;
    const meta = resp.meta ?? {};
    return {
      valid: d.valid,
      pqcValid: d.pqc_valid,
      hmacValid: d.hmac_valid,
      algorithm: d.algorithm,
      verificationMetadata: d.verification_metadata ?? {},
      requestId: meta.request_id as string | undefined,
    };
  }
}
