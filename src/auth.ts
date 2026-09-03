/**
 * Auth resource for authentication and MFA operations.
 *
 * Provides login, registration, token refresh, logout, and
 * multi-factor authentication setup/verification.
 */

import type { Transport } from "./transport.js";

/** @internal */
interface RawLoginData {
  token: string;
  refresh_token: string;
  tenant_id: string;
}

/** @internal */
interface RawRegisterData {
  user_id: string;
  tenant_id: string;
}

/** @internal */
interface RawTokenData {
  token: string;
  refresh_token: string;
}

/** @internal */
interface RawMfaSetupData {
  secret: string;
  qr_code: string;
}

/** @internal */
interface RawMfaVerifyData {
  verified: boolean;
  backup_codes: string[];
}

/**
 * Auth operations - login, register, refresh, logout, MFA.
 *
 * @example
 * ```ts
 * const qs = new QuantaSeal({ apiKey: "qs_test_abc123" });
 * const session = await qs.auth.login("user@example.com", "password");
 * ```
 */
export class AuthResource {
  /** @internal */
  constructor(private readonly transport: Transport) {}

  /**
   * Authenticate with email and password.
   *
   * @param email - User email address.
   * @param password - User password.
   * @returns Object with token, refreshToken, and tenantId.
   */
  async login(
    email: string,
    password: string,
  ): Promise<{ token: string; refreshToken: string; tenantId: string }> {
    const resp = await this.transport.request<RawLoginData>(
      "POST",
      "/api/v2/auth/login",
      { json: { email, password } },
    );
    const data = resp.data!;
    return {
      token: data.token,
      refreshToken: data.refresh_token,
      tenantId: data.tenant_id,
    };
  }

  /**
   * Register a new user and organisation.
   *
   * @param email - New user's email address.
   * @param password - New user's password.
   * @param orgName - Organisation / tenant name.
   * @returns Object with userId and tenantId.
   */
  async register(
    email: string,
    password: string,
    orgName: string,
  ): Promise<{ userId: string; tenantId: string }> {
    const resp = await this.transport.request<RawRegisterData>(
      "POST",
      "/api/v2/auth/register",
      { json: { email, password, org_name: orgName } },
    );
    const data = resp.data!;
    return {
      userId: data.user_id,
      tenantId: data.tenant_id,
    };
  }

  /**
   * Exchange a refresh token for a new access token pair.
   *
   * @param refreshToken - Valid refresh token from a previous login/refresh.
   * @returns Object with new token and refreshToken.
   */
  async refresh(
    refreshToken: string,
  ): Promise<{ token: string; refreshToken: string }> {
    const resp = await this.transport.request<RawTokenData>(
      "POST",
      "/api/v2/auth/refresh",
      { json: { refresh_token: refreshToken } },
    );
    const data = resp.data!;
    return {
      token: data.token,
      refreshToken: data.refresh_token,
    };
  }

  /**
   * Invalidate the current refresh token (logout).
   *
   * @param refreshToken - Refresh token to invalidate.
   */
  async logout(refreshToken: string): Promise<void> {
    await this.transport.requestRaw("POST", "/api/v2/auth/logout", {
      json: { refresh_token: refreshToken },
    });
  }

  /**
   * Begin MFA setup - returns a TOTP secret and QR code image.
   *
   * @returns Object with TOTP secret and base64-encoded QR code.
   */
  async setupMfa(): Promise<{ secret: string; qrCode: string }> {
    const resp = await this.transport.request<RawMfaSetupData>(
      "POST",
      "/api/v2/auth/mfa/setup",
    );
    const data = resp.data!;
    return {
      secret: data.secret,
      qrCode: data.qr_code,
    };
  }

  /**
   * Verify a TOTP code and complete MFA setup.
   *
   * @param totpCode - 6-digit TOTP code from authenticator app.
   * @returns Object with verification status and backup codes.
   */
  async verifyMfa(
    totpCode: string,
  ): Promise<{ verified: boolean; backupCodes: string[] }> {
    const resp = await this.transport.request<RawMfaVerifyData>(
      "POST",
      "/api/v2/auth/mfa/verify",
      { json: { totp_code: totpCode } },
    );
    const data = resp.data!;
    return {
      verified: data.verified,
      backupCodes: data.backup_codes ?? [],
    };
  }
}
