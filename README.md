# @quantaseal/sdk

> Quantum-safe encryption, digital signatures, and credential vault management for Node.js.

[![npm version](https://img.shields.io/npm/v/@quantaseal/sdk)](https://www.npmjs.com/package/@quantaseal/sdk)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.x-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

The official QuantaSeal Node.js SDK wraps the QuantaSeal REST API with full TypeScript types, automatic retries with exponential backoff, and a clean async interface for quantum-safe cryptography.

## Installation

```bash
npm install @quantaseal/sdk
```

## Quick Start

```ts
import { QuantaSeal } from "@quantaseal/sdk";

const qs = new QuantaSeal({ apiKey: "qs_test_abc123" });

// Encrypt data (ML-KEM-768 + AES-256-GCM + ML-DSA-65)
const encrypted = await qs.encrypt(Buffer.from("hello world"));
console.log(encrypted.ciphertext);   // base64
console.log(encrypted.algorithm);    // "ML-KEM-768"

// Decrypt data
const decrypted = await qs.decrypt(encrypted.envelope);
console.log(Buffer.from(decrypted.plaintext, "base64").toString()); // "hello world"
```

## Operations

### Encrypt

```ts
const result = await qs.encrypt(Buffer.from("sensitive data"), {
  algorithm: "ML-KEM-768",              // default
  encryptionContext: { purpose: "pii" }, // optional AAD
});

console.log(result.ciphertext);          // base64-encoded ciphertext
console.log(result.signature);           // ML-DSA-65 signature
console.log(result.envelope);            // full envelope for decryption
console.log(result.algorithm);           // "ML-KEM-768"
console.log(result.keyId);              // encryption key ID
console.log(result.requestId);          // audit trail
```

### Decrypt

```ts
const decrypted = await qs.decrypt(result.envelope, {
  verifySignature: true,  // default - verify ML-DSA-65 sig before decryption
});

console.log(decrypted.plaintext);         // base64-encoded original
console.log(decrypted.signatureValid);    // true
```

### Sign

```ts
const signed = await qs.sign(Buffer.from("document content"), {
  algorithm: "ML-DSA-65",  // default
});

console.log(signed.signature);       // ML-DSA-65 signature
console.log(signed.hmacSignature);   // HMAC-SHA-512 signature
console.log(signed.publicKey);       // for verification
console.log(signed.algorithm);       // "ML-DSA-65"
```

### Verify

```ts
const verified = await qs.verify({
  data: Buffer.from("document content"),
  signature: signed.signature,
  hmacSignature: signed.hmacSignature,
  publicKey: signed.publicKey,
  hmacSecret: "optional-custom-secret", // uses tenant key if omitted
});

console.log(verified.valid);     // true (overall)
console.log(verified.pqcValid);  // true (ML-DSA-65)
console.log(verified.hmacValid); // true (HMAC-SHA-512)
```

### Vault - Seal (Encrypt + Store)

```ts
const entryId = await qs.vault.seal({
  name: "aws-prod-keys",
  credentialType: "api_key",           // api_key | password | certificate | ssh_key | oauth_token | database | generic
  plaintext: {
    access_key: "AKIA...",
    secret_key: "wJal...",
  },
  ttlDays: 90,                         // optional (1–365)
  metadata: { environment: "prod" },   // optional
});
```

### Vault - Unseal (Decrypt + Retrieve)

```ts
const creds = await qs.vault.unseal(entryId);
console.log(creds.plaintext);         // { access_key: "AKIA...", ... }
console.log(creds.lastAccessedAt);    // ISO 8601
```

### Vault - Rotate Keys

```ts
const rotated = await qs.vault.rotate(entryId);
console.log(rotated.newEntryId);      // fresh entry with new keys
console.log(rotated.oldEntryId);      // old entry (now inactive)
```

### Vault - List Entries

```ts
const entries = await qs.vault.list();
// or include soft-deleted:
const all = await qs.vault.list({ includeInactive: true });

for (const entry of entries) {
  console.log(entry.name, entry.credentialType, entry.isActive);
}
```

### Vault - Delete

```ts
await qs.vault.delete(entryId);  // soft-delete
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `QUANTASHIELD_API_KEY` | API key (`qs_live_...` or `qs_test_...`) | - |
| `QUANTASHIELD_BASE_URL` | API base URL | `https://api.quantaseal.io` |

### Constructor Options

```ts
const qs = new QuantaSeal({
  apiKey: "qs_test_...",         // or set QUANTASHIELD_API_KEY
  baseUrl: "https://...",        // or set QUANTASHIELD_BASE_URL
  timeout: 30_000,               // request timeout in ms (default 30s)
  maxRetries: 3,                 // retry transient failures (default 3)
  headers: {                     // extra headers on every request
    "X-Custom-Header": "value",
  },
});
```

## Error Handling

All errors extend `QuantaSealError` with structured properties:

```ts
import {
  QuantaSealError,
  AuthenticationError,
  ValidationError,
  NotFoundError,
  VaultError,
  RateLimitError,
  ServerError,
  ConnectionError,
  TimeoutError,
} from "@quantaseal/sdk";

try {
  await qs.encrypt(data);
} catch (err) {
  if (err instanceof RateLimitError) {
    // err.retryAfter - seconds to wait
    await sleep(err.retryAfter! * 1000);
    // retry...
  } else if (err instanceof AuthenticationError) {
    // err.statusCode - 401 or 403
    console.error("Auth failed:", err.message);
  } else if (err instanceof QuantaSealError) {
    // Base class - catches all SDK errors
    console.error(err.statusCode, err.errorCode, err.requestId);
  }
}
```

### Exception Hierarchy

| Exception | HTTP Status | Description |
|-----------|-------------|-------------|
| `QuantaSealError` | Any | Base class for all SDK errors |
| `AuthenticationError` | 401, 403 | Invalid/expired API key or insufficient permissions |
| `ValidationError` | 400, 422 | Invalid request (bad base64, missing fields) |
| `NotFoundError` | 404 | Resource not found (invalid vault entry ID) |
| `VaultError` | 410 | Vault entry expired (TTL exceeded) |
| `RateLimitError` | 429 | Rate limit exceeded (check `retryAfter`) |
| `ServerError` | 5xx | Transient server error (auto-retried) |
| `ConnectionError` | - | Network connectivity failure |
| `TimeoutError` | - | Request timed out |

## Algorithms

| Operation | Algorithm | Standard |
|-----------|-----------|----------|
| Key Encapsulation | ML-KEM-768 | NIST FIPS 203 |
| Symmetric Encryption | AES-256-GCM | NIST SP 800-38D |
| Digital Signature | ML-DSA-65 | NIST FIPS 204 |
| HMAC | HMAC-SHA-512 | RFC 2104 |

## Requirements

- Node.js >= 18.0.0
- TypeScript >= 5.0 (optional, for type checking)

## API Reference

### `QuantaSeal`

| Method | Returns | Description |
|--------|---------|-------------|
| `encrypt(plaintext, options?)` | `Promise<EncryptResult>` | Encrypt data with ML-KEM-768 |
| `decrypt(envelope, options?)` | `Promise<DecryptResult>` | Decrypt a HybridCryptoEnvelope |
| `sign(data, options?)` | `Promise<SignResult>` | Sign data with ML-DSA-65 |
| `verify(params)` | `Promise<VerifyResult>` | Verify ML-DSA-65 + HMAC signature |

### `QuantaSeal.vault`

| Method | Returns | Description |
|--------|---------|-------------|
| `seal(params)` | `Promise<string>` | Encrypt + store credential (returns UUID) |
| `unseal(entryId)` | `Promise<VaultUnsealResult>` | Decrypt + retrieve credential |
| `rotate(entryId)` | `Promise<VaultRotateResult>` | Re-encrypt with fresh keys |
| `list(options?)` | `Promise<VaultEntry[]>` | List entry metadata (no plaintext) |
| `delete(entryId)` | `Promise<void>` | Soft-delete entry |

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Type check
npm run typecheck

# Build
npm run build
```

## License

MIT - see [LICENSE](LICENSE) for details.
