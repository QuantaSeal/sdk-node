/**
 * Tests for QuantaSeal client initialization.
 */
import { describe, expect, it } from "vitest";
import { QuantaSeal } from "../src/client.js";

const BASE_URL = "https://api.test.quantaseal.io";

describe("QuantaSeal client init", () => {
  it("creates client with explicit API key", () => {
    const qs = new QuantaSeal({ apiKey: "qs_test_123", baseUrl: BASE_URL });
    expect(qs).toBeDefined();
    expect(qs.vault).toBeDefined();
    expect(qs.encryption).toBeDefined();
  });

  it("reads API key from env var", () => {
    process.env.QUANTASHIELD_API_KEY = "qs_test_env";
    try {
      const qs = new QuantaSeal({ baseUrl: BASE_URL });
      expect(qs).toBeDefined();
    } finally {
      delete process.env.QUANTASHIELD_API_KEY;
    }
  });

  it("throws when no API key is provided", () => {
    delete process.env.QUANTASHIELD_API_KEY;
    expect(() => new QuantaSeal({ baseUrl: BASE_URL })).toThrow(
      "API key must be provided",
    );
  });

  it("reads base URL from env var", () => {
    process.env.QUANTASHIELD_BASE_URL = "https://custom.api.io";
    try {
      const qs = new QuantaSeal({ apiKey: "qs_test_123" });
      expect(qs.toString()).toContain("QuantaSeal");
    } finally {
      delete process.env.QUANTASHIELD_BASE_URL;
    }
  });

  it("defaults to production URL when no base URL provided", () => {
    delete process.env.QUANTASHIELD_BASE_URL;
    const qs = new QuantaSeal({ apiKey: "qs_test_123" });
    expect(qs).toBeDefined();
  });
});
