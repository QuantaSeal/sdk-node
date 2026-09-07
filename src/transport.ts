/**
 * HTTP transport layer for the QuantaSeal Node.js SDK.
 *
 * Uses the built-in `fetch()` API (Node 18+) with exponential-backoff
 * retries for transient failures (429, 5xx).
 */

import {
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
import type { APIResponse } from "./models.js";
import { VERSION } from "./version.js";

const RETRY_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const BACKOFF_FACTOR = 0.5;

/** @internal */
export interface TransportOptions {
  baseUrl: string;
  apiKey: string;
  timeout: number;
  maxRetries: number;
  headers?: Record<string, string>;
}

/**
 * Build default headers for every request.
 * @internal
 */
function buildHeaders(
  apiKey: string,
  extra?: Record<string, string>,
): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": `quantaseal-node/${VERSION}`,
    "X-SDK-Version": VERSION,
    "X-SDK-Language": "node",
  };
  if (extra) {
    Object.assign(headers, extra);
  }
  return headers;
}

/**
 * Parse the API error body and throw the appropriate typed error.
 * @internal
 */
function raiseForStatus(
  status: number,
  body: Record<string, unknown>,
  responseHeaders: Headers,
): never {
  const errorData = (body.error ?? {}) as Record<string, unknown>;
  const meta = (body.meta ?? {}) as Record<string, unknown>;

  const message =
    (errorData.message as string) ??
    (errorData.detail as string) ??
    (body.detail as string) ??
    `HTTP ${status}`;

  const ctx = {
    statusCode: status,
    errorCode: errorData.code as string | undefined,
    details: errorData.details as Record<string, unknown> | undefined,
    requestId: meta.request_id as string | undefined,
  };

  if (status === 401 || status === 403) {
    throw new AuthenticationError(message, ctx);
  }
  if (status === 400 || status === 422) {
    throw new ValidationError(message, ctx);
  }
  if (status === 404) {
    throw new NotFoundError(message, ctx);
  }
  if (status === 410) {
    throw new VaultError(message, ctx);
  }
  if (status === 429) {
    const retryAfterHeader = responseHeaders.get("Retry-After");
    const retryAfter = retryAfterHeader
      ? parseFloat(retryAfterHeader)
      : undefined;
    throw new RateLimitError(message, { ...ctx, retryAfter });
  }
  if (status >= 500) {
    throw new ServerError(message, ctx);
  }
  throw new QuantaSealError(message, ctx);
}

/** Calculate exponential backoff delay. @internal */
function backoffDelay(attempt: number, retryAfterHeader?: string | null): number {
  if (retryAfterHeader) {
    const parsed = parseFloat(retryAfterHeader);
    if (!Number.isNaN(parsed)) return parsed * 1000;
  }
  return BACKOFF_FACTOR * 2 ** attempt * 1000;
}

/** Sleep for a given number of milliseconds. @internal */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Async HTTP transport backed by the native `fetch()` API.
 *
 * Handles retries with exponential backoff, error mapping,
 * and timeout via `AbortController`.
 *
 * @internal - Users should interact via the {@link QuantaSeal} client.
 */
export class Transport {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;
  private readonly timeout: number;
  private readonly maxRetries: number;

  constructor(opts: TransportOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
    this.headers = buildHeaders(opts.apiKey, opts.headers);
    this.timeout = opts.timeout;
    this.maxRetries = opts.maxRetries;
  }

  /**
   * Make an HTTP request with retries.
   * Returns the parsed {@link APIResponse} envelope.
   */
  async request<T = unknown>(
    method: string,
    path: string,
    options: {
      json?: Record<string, unknown>;
      params?: Record<string, string>;
    } = {},
  ): Promise<APIResponse<T>> {
    const url = this.buildUrl(path, options.params);

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(url, {
          method,
          headers: this.headers,
          body: options.json ? JSON.stringify(options.json) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (response.ok) {
          const json = (await response.json()) as APIResponse<T>;
          return json;
        }

        // Retry transient failures
        if (
          RETRY_STATUS_CODES.has(response.status) &&
          attempt < this.maxRetries
        ) {
          const delay = backoffDelay(
            attempt,
            response.headers.get("Retry-After"),
          );
          await sleep(delay);
          continue;
        }

        // Non-retryable error - parse and throw
        let body: Record<string, unknown>;
        try {
          body = (await response.json()) as Record<string, unknown>;
        } catch {
          body = { error: { message: response.statusText || "Unknown error" } };
        }
        raiseForStatus(response.status, body, response.headers);
      } catch (err) {
        clearTimeout(timer);

        // Re-throw SDK errors immediately (they come from raiseForStatus)
        if (err instanceof QuantaSealError) throw err;

        if ((err as Error).name === "AbortError") {
          if (attempt < this.maxRetries) {
            await sleep(backoffDelay(attempt));
            continue;
          }
          throw new TimeoutError(
            `Request timed out after ${this.timeout}ms`,
            { statusCode: undefined },
          );
        }

        // Network / connection errors
        if (attempt < this.maxRetries) {
          await sleep(backoffDelay(attempt));
          continue;
        }

        throw new ConnectionError(
          `Failed to connect to ${this.baseUrl}: ${(err as Error).message}`,
        );
      }
    }

    throw new QuantaSealError(
      `Max retries (${this.maxRetries}) exceeded`,
    );
  }

  /**
   * Make a raw HTTP request (for endpoints with no response body, e.g. DELETE 204).
   */
  async requestRaw(
    method: string,
    path: string,
    options: {
      json?: Record<string, unknown>;
      params?: Record<string, string>;
    } = {},
  ): Promise<Response> {
    const url = this.buildUrl(path, options.params);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: this.headers,
        body: options.json ? JSON.stringify(options.json) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (response.status >= 400) {
        let body: Record<string, unknown>;
        try {
          body = (await response.json()) as Record<string, unknown>;
        } catch {
          body = {
            error: { message: response.statusText || "Unknown error" },
          };
        }
        raiseForStatus(response.status, body, response.headers);
      }

      return response;
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof QuantaSealError) throw err;
      throw new ConnectionError(
        `Failed to connect to ${this.baseUrl}: ${(err as Error).message}`,
      );
    }
  }

  /** Build the full URL with optional query string. @internal */
  private buildUrl(path: string, params?: Record<string, string>): string {
    const url = new URL(path, this.baseUrl);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }
    return url.toString();
  }
}
