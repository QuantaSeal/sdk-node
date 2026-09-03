/**
 * Tests for vault operations (seal, unseal, rotate, list, delete).
 */
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { QuantaSeal } from "../src/client.js";
import { NotFoundError, VaultError } from "../src/errors.js";
import {
  API_KEY,
  BASE_URL,
  MOCK_VAULT_LIST_RESPONSE,
  MOCK_VAULT_ROTATE_RESPONSE,
  MOCK_VAULT_SEAL_RESPONSE,
  MOCK_VAULT_UNSEAL_RESPONSE,
} from "./fixtures.js";
import { server } from "./server.js";

function makeClient() {
  return new QuantaSeal({
    apiKey: API_KEY,
    baseUrl: BASE_URL,
    maxRetries: 0,
  });
}

describe("vault.seal", () => {
  it("seals a credential successfully", async () => {
    server.use(
      http.post(`${BASE_URL}/api/v2/vault/seal`, () =>
        HttpResponse.json(MOCK_VAULT_SEAL_RESPONSE, { status: 201 }),
      ),
    );

    const qs = makeClient();
    const entryId = await qs.vault.seal({
      name: "aws-prod-keys",
      credentialType: "api_key",
      plaintext: { access_key: "AKIA...", secret_key: "wJal..." },
    });

    expect(entryId).toBe("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
  });

  it("sends ttl_days and metadata", async () => {
    let capturedBody: Record<string, unknown> | undefined;
    server.use(
      http.post(`${BASE_URL}/api/v2/vault/seal`, async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(MOCK_VAULT_SEAL_RESPONSE, { status: 201 });
      }),
    );

    const qs = makeClient();
    await qs.vault.seal({
      name: "temp-creds",
      credentialType: "password",
      plaintext: { password: "s3cret" },
      ttlDays: 30,
      metadata: { environment: "staging" },
    });

    expect(capturedBody?.ttl_days).toBe(30);
    expect(capturedBody?.metadata).toEqual({ environment: "staging" });
  });

  it("omits optional fields when not provided", async () => {
    let capturedBody: Record<string, unknown> | undefined;
    server.use(
      http.post(`${BASE_URL}/api/v2/vault/seal`, async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(MOCK_VAULT_SEAL_RESPONSE, { status: 201 });
      }),
    );

    const qs = makeClient();
    await qs.vault.seal({
      name: "test-cred",
      credentialType: "certificate",
      plaintext: { cert: "-----BEGIN CERTIFICATE-----" },
    });

    expect(capturedBody?.name).toBe("test-cred");
    expect(capturedBody?.credential_type).toBe("certificate");
    expect(capturedBody).not.toHaveProperty("ttl_days");
  });
});

describe("vault.unseal", () => {
  const entryId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

  it("unseals a credential successfully", async () => {
    server.use(
      http.post(`${BASE_URL}/api/v2/vault/unseal/${entryId}`, () =>
        HttpResponse.json(MOCK_VAULT_UNSEAL_RESPONSE),
      ),
    );

    const qs = makeClient();
    const result = await qs.vault.unseal(entryId);

    expect(result.plaintext.access_key).toBe("AKIAIOSFODNN7EXAMPLE");
    expect(result.lastAccessedAt).toBe("2026-03-02T12:00:05Z");
    expect(result.requestId).toBe("req_unseal12");
  });

  it("throws NotFoundError on 404", async () => {
    server.use(
      http.post(`${BASE_URL}/api/v2/vault/unseal/nonexistent`, () =>
        HttpResponse.json(
          {
            success: false,
            error: { message: "Vault entry not found" },
            meta: {},
          },
          { status: 404 },
        ),
      ),
    );

    const qs = makeClient();
    await expect(qs.vault.unseal("nonexistent")).rejects.toThrow(
      NotFoundError,
    );
  });

  it("throws VaultError on 410 (expired)", async () => {
    server.use(
      http.post(`${BASE_URL}/api/v2/vault/unseal/expired-id`, () =>
        HttpResponse.json(
          {
            success: false,
            error: { message: "Vault entry has expired" },
            meta: {},
          },
          { status: 410 },
        ),
      ),
    );

    const qs = makeClient();
    await expect(qs.vault.unseal("expired-id")).rejects.toThrow(VaultError);
  });
});

describe("vault.list", () => {
  it("lists vault entries", async () => {
    server.use(
      http.get(`${BASE_URL}/api/v2/vault/entries`, () =>
        HttpResponse.json(MOCK_VAULT_LIST_RESPONSE),
      ),
    );

    const qs = makeClient();
    const entries = await qs.vault.list();

    expect(entries).toHaveLength(2);
    expect(entries[0].name).toBe("aws-prod-keys");
    expect(entries[0].credentialType).toBe("api_key");
    expect(entries[0].isActive).toBe(true);
    expect(entries[1].name).toBe("stripe-api-key");
    expect(entries[1].lastAccessedAt).toBeNull();
  });

  it("sends include_inactive param", async () => {
    let capturedUrl = "";
    server.use(
      http.get(`${BASE_URL}/api/v2/vault/entries`, ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json(MOCK_VAULT_LIST_RESPONSE);
      }),
    );

    const qs = makeClient();
    await qs.vault.list({ includeInactive: true });

    expect(capturedUrl).toContain("include_inactive=true");
  });
});

describe("vault.rotate", () => {
  it("rotates encryption keys", async () => {
    const entryId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    server.use(
      http.post(`${BASE_URL}/api/v2/vault/rotate/${entryId}`, () =>
        HttpResponse.json(MOCK_VAULT_ROTATE_RESPONSE),
      ),
    );

    const qs = makeClient();
    const result = await qs.vault.rotate(entryId);

    expect(result.newEntryId).toBe("new-uuid-1234-5678-abcd-ef1234567890");
    expect(result.oldEntryId).toBe(entryId);
  });
});

describe("vault.delete", () => {
  it("deletes a vault entry", async () => {
    const entryId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    server.use(
      http.delete(`${BASE_URL}/api/v2/vault/entries/${entryId}`, () =>
        new HttpResponse(null, { status: 204 }),
      ),
    );

    const qs = makeClient();
    await expect(qs.vault.delete(entryId)).resolves.toBeUndefined();
  });

  it("throws NotFoundError on 404", async () => {
    server.use(
      http.delete(`${BASE_URL}/api/v2/vault/entries/nonexistent`, () =>
        HttpResponse.json(
          {
            success: false,
            error: { message: "Vault entry not found" },
            meta: {},
          },
          { status: 404 },
        ),
      ),
    );

    const qs = makeClient();
    await expect(qs.vault.delete("nonexistent")).rejects.toThrow(
      NotFoundError,
    );
  });
});
