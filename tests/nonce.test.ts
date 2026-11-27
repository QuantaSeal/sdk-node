/** Anti-replay: every mutating call carries a unique X-Nonce; reads do not; a retry never reuses one. */

import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { QuantaSeal } from "../src/client.js";
import { API_KEY, BASE_URL, MOCK_ENCRYPT_RESPONSE } from "./fixtures.js";
import { server } from "./server.js";

// the server accepts 16-64 characters of letters, digits and hyphens
const NONCE_RULE = /^[A-Za-z0-9-]{16,64}$/;

describe("anti-replay nonce", () => {
  it("sends a valid, unique nonce on every mutating call", async () => {
    const seen: (string | null)[] = [];
    server.use(
      http.post(`${BASE_URL}/api/v2/encryption/encrypt`, ({ request }) => {
        seen.push(request.headers.get("X-Nonce"));
        return HttpResponse.json(MOCK_ENCRYPT_RESPONSE);
      }),
    );
    const qs = new QuantaSeal({ apiKey: API_KEY, baseUrl: BASE_URL });
    await qs.encrypt(new TextEncoder().encode("a"));
    await qs.encrypt(new TextEncoder().encode("b"));
    expect(seen).toHaveLength(2);
    for (const nonce of seen) {
      expect(nonce).not.toBeNull();
      expect(nonce).toMatch(NONCE_RULE);
    }
    expect(new Set(seen).size).toBe(2);
  });

  it("uses a new nonce when it retries", async () => {
    const seen: (string | null)[] = [];
    server.use(
      http.post(`${BASE_URL}/api/v2/encryption/encrypt`, ({ request }) => {
        seen.push(request.headers.get("X-Nonce"));
        if (seen.length === 1) {
          return HttpResponse.json({ error: { message: "boom" } }, { status: 500 });
        }
        return HttpResponse.json(MOCK_ENCRYPT_RESPONSE);
      }),
    );
    const qs = new QuantaSeal({ apiKey: API_KEY, baseUrl: BASE_URL, maxRetries: 2 });
    await qs.encrypt(new TextEncoder().encode("x"));
    expect(seen).toHaveLength(2);
    expect(seen[0]).not.toEqual(seen[1]);
    expect(seen[1]).toMatch(NONCE_RULE);
  });

  it("sends no nonce on a read", async () => {
    let nonce: string | null = "unset";
    server.use(
      http.get(`${BASE_URL}/api/v2/vault/entries`, ({ request }) => {
        nonce = request.headers.get("X-Nonce");
        return HttpResponse.json({ success: true, data: [] });
      }),
    );
    const qs = new QuantaSeal({ apiKey: API_KEY, baseUrl: BASE_URL });
    await qs.vault.list().catch(() => undefined);
    expect(nonce).toBeNull();
  });
});
