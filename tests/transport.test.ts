/**
 * Tests for HTTP transport - retries, error mapping, timeouts.
 */
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { QuantaSeal } from "../src/client.js";
import {
  AuthenticationError,
  QuantaSealError,
  RateLimitError,
  ServerError,
} from "../src/errors.js";
import { API_KEY, BASE_URL, MOCK_ENCRYPT_RESPONSE } from "./fixtures.js";
import { server } from "./server.js";

describe("retries", () => {
  it("retries on 500 and succeeds on second attempt", async () => {
    let attempt = 0;
    server.use(
      http.post(`${BASE_URL}/api/v2/encryption/encrypt`, () => {
        attempt++;
        if (attempt === 1) {
          return HttpResponse.json(
            { error: { message: "Internal Server Error" } },
            { status: 500 },
          );
        }
        return HttpResponse.json(MOCK_ENCRYPT_RESPONSE);
      }),
    );

    const qs = new QuantaSeal({
      apiKey: API_KEY,
      baseUrl: BASE_URL,
      maxRetries: 2,
    });

    const result = await qs.encrypt(Buffer.from("test"));
    expect(result.ciphertext).toBe("dGVzdC1jaXBoZXJ0ZXh0");
    expect(attempt).toBe(2);
  });

  it("retries on 429 and succeeds", async () => {
    let attempt = 0;
    server.use(
      http.post(`${BASE_URL}/api/v2/encryption/encrypt`, () => {
        attempt++;
        if (attempt === 1) {
          return HttpResponse.json(
            { error: { message: "Rate limited" } },
            { status: 429, headers: { "Retry-After": "0" } },
          );
        }
        return HttpResponse.json(MOCK_ENCRYPT_RESPONSE);
      }),
    );

    const qs = new QuantaSeal({
      apiKey: API_KEY,
      baseUrl: BASE_URL,
      maxRetries: 2,
    });

    const result = await qs.encrypt(Buffer.from("test"));
    expect(result.ciphertext).toBe("dGVzdC1jaXBoZXJ0ZXh0");
  });

  it("throws ServerError after max retries exhausted", async () => {
    server.use(
      http.post(`${BASE_URL}/api/v2/encryption/encrypt`, () =>
        HttpResponse.json(
          { error: { message: "Server Error" } },
          { status: 500 },
        ),
      ),
    );

    const qs = new QuantaSeal({
      apiKey: API_KEY,
      baseUrl: BASE_URL,
      maxRetries: 1,
    });

    await expect(qs.encrypt(Buffer.from("test"))).rejects.toThrow(
      ServerError,
    );
  });
});

describe("error mapping", () => {
  it("401 → AuthenticationError", async () => {
    server.use(
      http.post(`${BASE_URL}/api/v2/encryption/encrypt`, () =>
        HttpResponse.json(
          { error: { message: "Unauthorized" } },
          { status: 401 },
        ),
      ),
    );

    const qs = new QuantaSeal({
      apiKey: API_KEY,
      baseUrl: BASE_URL,
      maxRetries: 0,
    });
    await expect(qs.encrypt(Buffer.from("test"))).rejects.toThrow(
      AuthenticationError,
    );
  });

  it("403 → AuthenticationError", async () => {
    server.use(
      http.post(`${BASE_URL}/api/v2/encryption/encrypt`, () =>
        HttpResponse.json(
          { error: { message: "Forbidden" } },
          { status: 403 },
        ),
      ),
    );

    const qs = new QuantaSeal({
      apiKey: API_KEY,
      baseUrl: BASE_URL,
      maxRetries: 0,
    });
    await expect(qs.encrypt(Buffer.from("test"))).rejects.toThrow(
      AuthenticationError,
    );
  });

  it("429 → RateLimitError with retryAfter", async () => {
    server.use(
      http.post(`${BASE_URL}/api/v2/encryption/encrypt`, () =>
        HttpResponse.json(
          { error: { message: "Rate limited" } },
          { status: 429, headers: { "Retry-After": "30" } },
        ),
      ),
    );

    const qs = new QuantaSeal({
      apiKey: API_KEY,
      baseUrl: BASE_URL,
      maxRetries: 0,
    });

    try {
      await qs.encrypt(Buffer.from("test"));
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitError);
      expect((err as RateLimitError).retryAfter).toBe(30);
    }
  });
});

describe("exception attributes", () => {
  it("populates all error fields", () => {
    const err = new QuantaSealError("test error", {
      statusCode: 500,
      errorCode: "server_error",
      requestId: "req_123",
    });
    expect(err.message).toBe("test error");
    expect(err.statusCode).toBe(500);
    expect(err.errorCode).toBe("server_error");
    expect(err.requestId).toBe("req_123");
    expect(err.name).toBe("QuantaSealError");
  });
});
