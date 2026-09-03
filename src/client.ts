/**
 * QuantaSeal Node.js SDK - main client class.
 *
 * Provides quantum-safe encryption, digital signatures, and credential
 * vault management via the QuantaSeal REST API.
 *
 * @example
 * ```ts
 * import { QuantaSeal } from "@quantaseal/sdk";
 *
 * const qs = new QuantaSeal({ apiKey: "qs_test_abc123" });
 *
 * // Encrypt data
 * const encrypted = await qs.encrypt(Buffer.from("hello world"));
 *
 * // Decrypt data
 * const decrypted = await qs.decrypt(encrypted.envelope);
 *
 * // Store a credential in the vault
 * const id = await qs.vault.seal({
 *   name: "aws-prod",
 *   credentialType: "api_key",
 *   plaintext: { key: "AKIA..." },
 * });
 *
 * // Retrieve a credential
 * const creds = await qs.vault.unseal(id);
 * ```
 */

import { AgentResource } from "./agent.js";
import { AuditResource } from "./audit.js";
import { AuthResource } from "./auth.js";
import { BillingResource } from "./billing.js";
import { ComplianceResource } from "./compliance.js";
import { DiscoveryResource } from "./discovery.js";
import { Encryption } from "./encryption.js";
import { FilesResource } from "./files.js";
import { MappingsResource } from "./mappings.js";
import { MetricsResource } from "./metrics.js";
import { MftResource } from "./mft.js";
import type {
  DecryptResult,
  EncryptResult,
  QuantaSealOptions,
  SignResult,
  VerifyResult,
} from "./models.js";
import { ProxyResource } from "./proxy.js";
import { SecurityResource } from "./security.js";
import { SettingsResource } from "./settings.js";
import { SyncResource } from "./sync.js";
import { TokenizeResource } from "./tokenize.js";
import { Transport } from "./transport.js";
import { Vault } from "./vault.js";
import { WebhooksResource } from "./webhooks.js";
import { WorkflowsResource } from "./workflows.js";

const DEFAULT_BASE_URL = "https://api.quantaseal.io";
const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_MAX_RETRIES = 3;
const ENV_API_KEY = "QUANTASHIELD_API_KEY";
const ENV_BASE_URL = "QUANTASHIELD_BASE_URL";

/**
 * Read an environment variable (Node.js only, no-op in edge runtimes).
 * @internal
 */
function env(name: string): string | undefined {
  if (typeof process !== "undefined" && process.env) {
    return process.env[name];
  }
  return undefined;
}

/**
 * The QuantaSeal client.
 *
 * All methods are asynchronous and return promises. The client is
 * lightweight and safe to create per-request if needed, though reusing
 * a single instance is recommended for connection pooling.
 */
export class QuantaSeal {
  /** Authentication and MFA operations. */
  readonly auth: AuthResource;

  /** External system proxy integrations and request forwarding. */
  readonly proxy: ProxyResource;

  /** Compliance report generation and scoring. */
  readonly compliance: ComplianceResource;

  /** Subscription plan, usage, and invoicing. */
  readonly billing: BillingResource;

  /** API key management and emergency lockdown. */
  readonly security: SecurityResource;

  /** AI security agent conversations. */
  readonly agent: AgentResource;

  /** Format-preserving tokenization and detokenization. */
  readonly tokenize: TokenizeResource;

  /** Managed encrypted file transfer. */
  readonly mft: MftResource;

  /** Data synchronisation jobs between integrations. */
  readonly sync: SyncResource;

  /** Automated security and data processing workflows. */
  readonly workflows: WorkflowsResource;

  /** General file storage with PQC encryption. */
  readonly files: FilesResource;

  /** Immutable audit log access and export. */
  readonly audit: AuditResource;

  /** Usage, encryption, API, and vault statistics. */
  readonly metrics: MetricsResource;

  /** Webhook subscription and delivery management. */
  readonly webhooks: WebhooksResource;

  /** Tenant configuration and signing key management. */
  readonly settings: SettingsResource;

  /** Schema and field discovery for integrations. */
  readonly discovery: DiscoveryResource;

  /** Field-level mapping rules for integration pipelines. */
  readonly mappings: MappingsResource;

  /** Vault resource for credential lifecycle management. */
  readonly vault: Vault;

  /** Direct access to the Encryption resource. */
  readonly encryption: Encryption;

  /** @internal */
  private readonly transport: Transport;

  /**
   * Create a new QuantaSeal client.
   *
   * @param options - Client configuration. API key falls back to the
   *   `QUANTASHIELD_API_KEY` environment variable.
   * @throws {Error} If no API key is provided and the env var is not set.
   */
  constructor(options: QuantaSealOptions = {}) {
    const apiKey = options.apiKey ?? env(ENV_API_KEY);
    if (!apiKey) {
      throw new Error(
        `API key must be provided via options.apiKey or the ${ENV_API_KEY} environment variable`,
      );
    }

    const baseUrl =
      options.baseUrl ?? env(ENV_BASE_URL) ?? DEFAULT_BASE_URL;

    this.transport = new Transport({
      baseUrl,
      apiKey,
      timeout: options.timeout ?? DEFAULT_TIMEOUT,
      maxRetries: options.maxRetries ?? DEFAULT_MAX_RETRIES,
      headers: options.headers,
    });

    this.auth = new AuthResource(this.transport);
    this.proxy = new ProxyResource(this.transport);
    this.compliance = new ComplianceResource(this.transport);
    this.billing = new BillingResource(this.transport);
    this.security = new SecurityResource(this.transport);
    this.agent = new AgentResource(this.transport);
    this.tokenize = new TokenizeResource(this.transport);
    this.mft = new MftResource(this.transport);
    this.sync = new SyncResource(this.transport);
    this.workflows = new WorkflowsResource(this.transport);
    this.files = new FilesResource(this.transport);
    this.audit = new AuditResource(this.transport);
    this.metrics = new MetricsResource(this.transport);
    this.webhooks = new WebhooksResource(this.transport);
    this.settings = new SettingsResource(this.transport);
    this.discovery = new DiscoveryResource(this.transport);
    this.mappings = new MappingsResource(this.transport);
    this.encryption = new Encryption(this.transport);
    this.vault = new Vault(this.transport);
  }

  // ── Convenience methods (delegate to Encryption resource) ──────────────

  /**
   * Encrypt data using ML-KEM-768 + AES-256-GCM + ML-DSA-65.
   *
   * Convenience wrapper around `qs.encryption.encrypt()`.
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
    return this.encryption.encrypt(plaintext, options);
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
    return this.encryption.decrypt(envelope, options);
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
    return this.encryption.sign(data, options);
  }

  /**
   * Verify an ML-DSA-65 + HMAC-SHA-512 signature.
   *
   * @param params - Verification parameters (data, signature, hmacSignature, publicKey).
   * @returns VerifyResult with per-algorithm validity flags.
   */
  async verify(params: {
    data: Buffer | Uint8Array;
    signature: string;
    hmacSignature: string;
    publicKey: string;
    hmacSecret?: string;
  }): Promise<VerifyResult> {
    return this.encryption.verify(params);
  }

  toString(): string {
    return `QuantaSeal(node)`;
  }
}
