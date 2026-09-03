/**
 * Exception hierarchy for the QuantaSeal Node.js SDK.
 *
 * All SDK errors extend {@link QuantaSealError}, which itself extends
 * the built-in `Error`.  Catch the base class for a blanket handler,
 * or catch specific sub-classes for granular control.
 */

/** Additional context attached to every SDK error. */
export interface ErrorContext {
  /** HTTP status code from the API, if applicable. */
  statusCode?: number;
  /** Machine-readable error code from the API response. */
  errorCode?: string;
  /** Additional error details from the API response. */
  details?: Record<string, unknown>;
  /** Request ID for support / audit trail. */
  requestId?: string;
}

/**
 * Base error for all QuantaSeal SDK errors.
 *
 * @example
 * ```ts
 * try {
 *   await qs.encrypt(data);
 * } catch (err) {
 *   if (err instanceof QuantaSealError) {
 *     console.error(err.statusCode, err.errorCode, err.requestId);
 *   }
 * }
 * ```
 */
export class QuantaSealError extends Error {
  readonly statusCode?: number;
  readonly errorCode?: string;
  readonly details: Record<string, unknown>;
  readonly requestId?: string;

  constructor(message: string, ctx: ErrorContext = {}) {
    super(message);
    this.name = "QuantaSealError";
    this.statusCode = ctx.statusCode;
    this.errorCode = ctx.errorCode;
    this.details = ctx.details ?? {};
    this.requestId = ctx.requestId;

    // Maintain proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Raised when authentication fails (HTTP 401 / 403).
 *
 * Common causes:
 * - Invalid or expired API key
 * - Missing `Authorization` header
 * - Insufficient permissions
 */
export class AuthenticationError extends QuantaSealError {
  constructor(message: string, ctx: ErrorContext = {}) {
    super(message, ctx);
    this.name = "AuthenticationError";
  }
}

/**
 * Raised when request validation fails (HTTP 400 / 422).
 *
 * Common causes:
 * - Invalid base64 encoding
 * - Missing required fields
 * - Invalid credential type for vault operations
 */
export class ValidationError extends QuantaSealError {
  constructor(message: string, ctx: ErrorContext = {}) {
    super(message, ctx);
    this.name = "ValidationError";
  }
}

/**
 * Raised when a requested resource is not found (HTTP 404).
 *
 * Common causes:
 * - Invalid vault entry ID
 * - Deleted entry
 */
export class NotFoundError extends QuantaSealError {
  constructor(message: string, ctx: ErrorContext = {}) {
    super(message, ctx);
    this.name = "NotFoundError";
  }
}

/**
 * Raised when a vault entry has expired (HTTP 410 Gone).
 */
export class VaultError extends QuantaSealError {
  constructor(message: string, ctx: ErrorContext = {}) {
    super(message, ctx);
    this.name = "VaultError";
  }
}

/**
 * Raised when rate limits are exceeded (HTTP 429).
 *
 * Check {@link retryAfter} for the recommended wait time.
 */
export class RateLimitError extends QuantaSealError {
  /** Seconds to wait before retrying (from `Retry-After` header). */
  readonly retryAfter?: number;

  constructor(
    message: string,
    ctx: ErrorContext & { retryAfter?: number } = {},
  ) {
    super(message, ctx);
    this.name = "RateLimitError";
    this.retryAfter = ctx.retryAfter;
  }
}

/**
 * Raised when the QuantaSeal API returns a server error (5xx).
 * These errors are typically transient and can be retried.
 */
export class ServerError extends QuantaSealError {
  constructor(message: string, ctx: ErrorContext = {}) {
    super(message, ctx);
    this.name = "ServerError";
  }
}

/**
 * Raised when a connection to the API server cannot be established.
 */
export class ConnectionError extends QuantaSealError {
  constructor(message: string, ctx: ErrorContext = {}) {
    super(message, ctx);
    this.name = "ConnectionError";
  }
}

/**
 * Raised when a request times out.
 */
export class TimeoutError extends QuantaSealError {
  constructor(message: string, ctx: ErrorContext = {}) {
    super(message, ctx);
    this.name = "TimeoutError";
  }
}
