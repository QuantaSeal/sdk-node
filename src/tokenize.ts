/**
 * Tokenize resource for format-preserving tokenization and detokenization
 * of sensitive data (PAN, SSN, phone numbers, etc.).
 */

import type { Transport } from "./transport.js";

/** A tokenization result for a single value. */
export interface TokenizeResult {
  /** The generated token (format-preserving if requested). */
  token: string;
  /** Original data type. */
  dataType: string;
  /** Whether format-preserving tokenization was used. */
  formatPreserving: boolean;
}

/** A detokenization result. */
export interface DetokenizeResult {
  /** The original plaintext value. */
  value: string;
  /** Data type of the original value. */
  dataType: string;
}

/** Input item for batch tokenization. */
export interface BatchTokenizeItem {
  /** The sensitive value to tokenize. */
  data: string;
  /** Data type identifier. */
  dataType: string;
  /** Whether to use format-preserving tokenization. */
  formatPreserving?: boolean;
}

/** Result for a single item in a batch tokenize response. */
export interface BatchTokenizeResult {
  /** The generated token. */
  token: string;
  /** Data type. */
  dataType: string;
  /** Whether format-preserving tokenization was applied. */
  formatPreserving: boolean;
  /** Index of the item in the original batch array. */
  index: number;
}

/**
 * Tokenization operations - tokenize, detokenize, batch.
 *
 * @example
 * ```ts
 * const qs = new QuantaSeal({ apiKey: "qs_test_abc123" });
 * const { token } = await qs.tokenize.tokenize("4111111111111111", "card_pan", true);
 * const { value } = await qs.tokenize.detokenize(token);
 * ```
 */
export class TokenizeResource {
  /** @internal */
  constructor(private readonly transport: Transport) {}

  /**
   * Tokenize a single sensitive value.
   *
   * @param data - The sensitive string value to tokenize.
   * @param dataType - Data type identifier (e.g. `"card_pan"`, `"ssn"`, `"phone"`).
   * @param formatPreserving - Preserve the format/length of the original value (default `false`).
   * @returns TokenizeResult with the generated token.
   */
  async tokenize(
    data: string,
    dataType: string,
    formatPreserving = false,
  ): Promise<TokenizeResult> {
    const resp = await this.transport.request<{
      token: string;
      data_type: string;
      format_preserving: boolean;
    }>("POST", "/api/v2/tokenize", {
      json: { data, data_type: dataType, format_preserving: formatPreserving },
    });
    const d = resp.data!;
    return {
      token: d.token,
      dataType: d.data_type,
      formatPreserving: d.format_preserving,
    };
  }

  /**
   * Detokenize a single token back to its original value.
   *
   * @param token - The token to resolve.
   * @returns DetokenizeResult with the original value.
   */
  async detokenize(token: string): Promise<DetokenizeResult> {
    const resp = await this.transport.request<{
      value: string;
      data_type: string;
    }>("POST", "/api/v2/detokenize", { json: { token } });
    const d = resp.data!;
    return { value: d.value, dataType: d.data_type };
  }

  /**
   * Tokenize multiple values in a single request.
   *
   * @param items - Array of BatchTokenizeItem objects.
   * @returns Array of BatchTokenizeResult objects in the same order.
   */
  async batchTokenize(items: BatchTokenizeItem[]): Promise<BatchTokenizeResult[]> {
    const resp = await this.transport.request<Array<{
      token: string;
      data_type: string;
      format_preserving: boolean;
      index: number;
    }>>("POST", "/api/v2/tokenize/batch", {
      json: {
        items: items.map((item, i) => ({
          data: item.data,
          data_type: item.dataType,
          format_preserving: item.formatPreserving ?? false,
          index: i,
        })),
      },
    });
    return (resp.data ?? []).map((d) => ({
      token: d.token,
      dataType: d.data_type,
      formatPreserving: d.format_preserving,
      index: d.index,
    }));
  }

  /**
   * Detokenize multiple tokens in a single request.
   *
   * @param tokens - Array of token strings to resolve.
   * @returns Array of DetokenizeResult objects in the same order.
   */
  async batchDetokenize(tokens: string[]): Promise<DetokenizeResult[]> {
    const resp = await this.transport.request<Array<{
      value: string;
      data_type: string;
    }>>("POST", "/api/v2/detokenize/batch", { json: { tokens } });
    return (resp.data ?? []).map((d) => ({
      value: d.value,
      dataType: d.data_type,
    }));
  }
}
