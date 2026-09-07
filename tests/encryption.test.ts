/**
 * Tests for encryption operations (encrypt, decrypt, sign, verify).
 */
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { QuantaSeal } from "../src/client.js";
import { AuthenticationError, ValidationError } from "../src/errors.js";
import {
  API_KEY,
  BASE_URL,
  MOCK_DECRYPT_RESPONSE,
  MOCK_ENCRYPT_RESPONSE,
  MOCK_SIGN_RESPONSE,
  MOCK_VERIFY_RESPONSE,
} from "./fixtures.js";
import { server } from "./server.js";

function makeClient() {
  return new QuantaSeal({
    apiKey: API_KEY,
    baseUrl: BASE_URL,
    maxRetries: 0,
  });
}

describe("encrypt", () => {
  it("encrypts data successfully", async () => {
    server.use(
      http.post(`${BASE_URL}/api/v2/encryption/encrypt`, () =>
        HttpResponse.json(MOCK_ENCRYPT_RESPONSE),
      ),
    );

    const qs = makeClient();
    const result = await qs.encrypt(Buffer.from("hello world"));

    expect(result.ciphertext).toBe("dGVzdC1jaXBoZXJ0ZXh0");
    expect(result.algorithm).toBe("ML-KEM-768");
    expect(result.keyId).toBe("k-001");
    expect(result.signature).toBe("c2lnbmF0dXJl");
    expect(result.envelope).toBeDefined();
    expect(result.requestId).toBe("req_abc12345");
  });

  it("sends encryption context", async () => {
    let capturedBody: Record<string, unknown> | undefined;
    server.use(
      http.post(`${BASE_URL}/api/v2/encryption/encrypt`, async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(MOCK_ENCRYPT_RESPONSE);
      }),
    );

    const qs = makeClient();
    await qs.encrypt(Buffer.from("data"), {
      encryptionContext: { purpose: "test" },
    });

    expect(capturedBody?.encryption_context).toEqual({ purpose: "test" });
  });

  it("throws AuthenticationError on 401", async () => {
    server.use(
      http.post(`${BASE_URL}/api/v2/encryption/encrypt`, () =>
        HttpResponse.json(
          {
            success: false,
            error: { message: "Invalid API key", code: "auth_error" },
            meta: { request_id: "req_err" },
          },
          { status: 401 },
        ),
      ),
    );

    const qs = makeClient();
    await expect(qs.encrypt(Buffer.from("data"))).rejects.toThrow(
      AuthenticationError,
    );
  });

  it("throws ValidationError on 422", async () => {
    server.use(
      http.post(`${BASE_URL}/api/v2/encryption/encrypt`, () =>
        HttpResponse.json(
          {
            success: false,
            error: { message: "Invalid base64 encoding" },
            meta: {},
          },
          { status: 422 },
        ),
      ),
    );

    const qs = makeClient();
    await expect(qs.encrypt(Buffer.from("data"))).rejects.toThrow(
      ValidationError,
    );
  });
});

describe("decrypt", () => {
  it("decrypts data successfully", async () => {
    server.use(
      http.post(`${BASE_URL}/api/v2/encryption/decrypt`, () =>
        HttpResponse.json(MOCK_DECRYPT_RESPONSE),
      ),
    );

    const qs = makeClient();
    const result = await qs.decrypt(
      MOCK_ENCRYPT_RESPONSE.data.envelope,
    );

    expect(result.plaintext).toBe("aGVsbG8gd29ybGQ=");
    expect(result.signatureValid).toBe(true);
    expect(result.requestId).toBe("req_dec12345");
  });

  it("sends verify_signature=false", async () => {
    let capturedBody: Record<string, unknown> | undefined;
    server.use(
      http.post(`${BASE_URL}/api/v2/encryption/decrypt`, async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(MOCK_DECRYPT_RESPONSE);
      }),
    );

    const qs = makeClient();
    await qs.decrypt({ envelope: "data" }, { verifySignature: false });

    expect(capturedBody?.verify_signature).toBe(false);
  });
});

describe("sign", () => {
  it("signs data successfully", async () => {
    server.use(
      http.post(`${BASE_URL}/api/v2/encryption/sign`, () =>
        HttpResponse.json(MOCK_SIGN_RESPONSE),
      ),
    );

    const qs = makeClient();
    const result = await qs.sign(Buffer.from("message to sign"));

    expect(result.signature).toBe("cHFjLXNpZw==");
    expect(result.hmacSignature).toBe("aG1hYy1zaWc=");
    expect(result.publicKey).toBe("cHVibGljLWtleQ==");
    expect(result.algorithm).toBe("ML-DSA-65");
    expect(result.requestId).toBe("req_sig12345");
  });
});

describe("verify", () => {
  it("verifies signature successfully", async () => {
    server.use(
      http.post(`${BASE_URL}/api/v2/encryption/verify`, () =>
        HttpResponse.json(MOCK_VERIFY_RESPONSE),
      ),
    );

    const qs = makeClient();
    const result = await qs.verify({
      data: Buffer.from("original data"),
      signature: "cHFjLXNpZw==",
      hmacSignature: "aG1hYy1zaWc=",
      publicKey: "cHVibGljLWtleQ==",
    });

    expect(result.valid).toBe(true);
    expect(result.pqcValid).toBe(true);
    expect(result.hmacValid).toBe(true);
    expect(result.algorithm).toBe("ML-DSA-65");
  });

  it("sends hmac_secret when provided", async () => {
    let capturedBody: Record<string, unknown> | undefined;
    server.use(
      http.post(`${BASE_URL}/api/v2/encryption/verify`, async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(MOCK_VERIFY_RESPONSE);
      }),
    );

    const qs = makeClient();
    await qs.verify({
      data: Buffer.from("data"),
      signature: "sig",
      hmacSignature: "hmac",
      publicKey: "pk",
      hmacSecret: "custom-secret",
    });

    expect(capturedBody?.hmac_secret).toBe("custom-secret");
  });
});
