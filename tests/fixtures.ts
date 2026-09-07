/**
 * Shared test fixtures and mock responses for the QuantaSeal Node.js SDK tests.
 */

export const BASE_URL = "https://api.test.quantaseal.io";
export const API_KEY = "qs_test_unit_abc123";

// ─── Mock response payloads ────────────────────────────────────────────────

export const MOCK_ENCRYPT_RESPONSE = {
  success: true,
  data: {
    ciphertext: "dGVzdC1jaXBoZXJ0ZXh0",
    encryption_metadata: {
      algorithm: "ML-KEM-768",
      key_id: "k-001",
      nonce: "bm9uY2U=",
    },
    signature: "c2lnbmF0dXJl",
    envelope: {
      version: 1,
      algorithm: "ML-KEM-768",
      encapsulated_key: "ZW5jYXBzdWxhdGVk",
      ciphertext: "dGVzdC1jaXBoZXJ0ZXh0",
      nonce: "bm9uY2U=",
      signature: "c2lnbmF0dXJl",
    },
  },
  meta: { request_id: "req_abc12345" },
};

export const MOCK_DECRYPT_RESPONSE = {
  success: true,
  data: {
    plaintext: "aGVsbG8gd29ybGQ=",
    signature_valid: true,
    encryption_metadata: {
      algorithm: "ML-KEM-768",
      key_id: "k-001",
    },
  },
  meta: { request_id: "req_dec12345" },
};

export const MOCK_SIGN_RESPONSE = {
  success: true,
  data: {
    signature: "cHFjLXNpZw==",
    hmac_signature: "aG1hYy1zaWc=",
    public_key: "cHVibGljLWtleQ==",
    algorithm: "ML-DSA-65",
  },
  meta: { request_id: "req_sig12345" },
};

export const MOCK_VERIFY_RESPONSE = {
  success: true,
  data: {
    valid: true,
    pqc_valid: true,
    hmac_valid: true,
    algorithm: "ML-DSA-65",
    verification_metadata: { timestamp: "2026-03-02T12:00:00Z" },
  },
  meta: { request_id: "req_ver12345" },
};

export const MOCK_VAULT_SEAL_RESPONSE = {
  success: true,
  data: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  meta: { request_id: "req_seal12345" },
};

export const MOCK_VAULT_UNSEAL_RESPONSE = {
  success: true,
  data: {
    plaintext: {
      access_key: "AKIAIOSFODNN7EXAMPLE",
      secret_key: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    },
    last_accessed_at: "2026-03-02T12:00:05Z",
  },
  meta: { request_id: "req_unseal12" },
};

export const MOCK_VAULT_LIST_RESPONSE = {
  success: true,
  data: [
    {
      id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      name: "aws-prod-keys",
      credential_type: "api_key",
      algorithm: "ML-KEM-768",
      is_active: true,
      created_at: "2026-03-01T10:00:00Z",
      last_accessed_at: "2026-03-02T12:00:05Z",
      ttl_expires_at: "2026-06-01T10:00:00Z",
    },
    {
      id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      name: "stripe-api-key",
      credential_type: "api_key",
      algorithm: "ML-KEM-768",
      is_active: true,
      created_at: "2026-03-01T11:00:00Z",
      last_accessed_at: null,
      ttl_expires_at: null,
    },
  ],
  meta: { request_id: "req_list12345" },
};

export const MOCK_VAULT_ROTATE_RESPONSE = {
  success: true,
  data: {
    new_entry_id: "new-uuid-1234-5678-abcd-ef1234567890",
    old_entry_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  },
  meta: { request_id: "req_rot12345" },
};
