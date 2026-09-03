/**
 * @quantaseal/sdk - Quantum-safe encryption, digital signatures, and
 * credential vault management for Node.js.
 *
 * @example
 * ```ts
 * import { QuantaSeal } from "@quantaseal/sdk";
 *
 * const qs = new QuantaSeal({ apiKey: "qs_test_abc123" });
 *
 * const encrypted = await qs.encrypt(Buffer.from("hello world"));
 * const decrypted = await qs.decrypt(encrypted.envelope);
 * ```
 *
 * @packageDocumentation
 */

// ── Client ──────────────────────────────────────────────────────────────────
export { QuantaSeal } from "./client.js";

// ── Resources ───────────────────────────────────────────────────────────────
export { AgentResource } from "./agent.js";
export { AuditResource } from "./audit.js";
export { AuthResource } from "./auth.js";
export { BillingResource } from "./billing.js";
export { ComplianceResource } from "./compliance.js";
export { DiscoveryResource } from "./discovery.js";
export { Encryption } from "./encryption.js";
export { FilesResource } from "./files.js";
export { MappingsResource } from "./mappings.js";
export { MetricsResource } from "./metrics.js";
export { MftResource } from "./mft.js";
export { ProxyResource } from "./proxy.js";
export { SecurityResource } from "./security.js";
export { SettingsResource } from "./settings.js";
export { SyncResource } from "./sync.js";
export { TokenizeResource } from "./tokenize.js";
export { Vault } from "./vault.js";
export { WebhooksResource } from "./webhooks.js";
export { WorkflowsResource } from "./workflows.js";

// ── Models / Types ──────────────────────────────────────────────────────────
export type {
  APIResponse,
  DecryptResult,
  EncryptResult,
  QuantaSealOptions,
  SignResult,
  VaultEntry,
  VaultRotateResult,
  VaultUnsealResult,
  VerifyResult,
} from "./models.js";

// ── Resource-level types ────────────────────────────────────────────────────
export type { AgentConversation, AgentMessage, AgentQueryResult } from "./agent.js";
export type { AuditListOptions, AuditLog } from "./audit.js";
export type { BillingPlan, BillingUsage, CheckoutSession, Invoice } from "./billing.js";
export type { ComplianceReport, ComplianceScore } from "./compliance.js";
export type { DiscoveredObject, ObjectField, SchemaDiscovery } from "./discovery.js";
export type { FileMetadata } from "./files.js";
export type { FieldMapping, ObjectMapping } from "./mappings.js";
export type { ApiStats, EncryptionStats, UsageMetrics, VaultStats } from "./metrics.js";
export type { FileTransfer } from "./mft.js";
export type { ForwardResult, Integration } from "./proxy.js";
export type { ApiKey, CreateApiKeyResult } from "./security.js";
export type { SettingsApiKey, TenantSettings } from "./settings.js";
export type { SyncJob, SyncJobExecution } from "./sync.js";
export type {
  BatchTokenizeItem,
  BatchTokenizeResult,
  DetokenizeResult,
  TokenizeResult,
} from "./tokenize.js";
export type { Webhook, WebhookDelivery } from "./webhooks.js";
export type { Workflow, WorkflowExecution } from "./workflows.js";

// ── Errors ──────────────────────────────────────────────────────────────────
export {
  AuthenticationError,
  ConnectionError,
  NotFoundError,
  QuantaSealError,
  RateLimitError,
  ServerError,
  TimeoutError,
  ValidationError,
  VaultError,
} from "./errors.js";

// ── Version ─────────────────────────────────────────────────────────────────
export { VERSION } from "./version.js";
