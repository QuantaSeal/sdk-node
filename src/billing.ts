/**
 * Billing resource for subscription plan management, usage tracking,
 * invoicing, and checkout sessions.
 */

import type { Transport } from "./transport.js";

/** Current subscription plan details. */
export interface BillingPlan {
  /** Plan tier name (e.g. "starter", "growth", "enterprise"). */
  tier: string;
  /** Monthly/annual price in cents. */
  pricePerPeriod?: number;
  /** Billing interval ("month" or "year"). */
  interval?: string;
  /** Plan feature limits. */
  limits?: Record<string, unknown>;
  /** ISO 8601 renewal date. */
  renewsAt?: string;
}

/** Current period usage summary. */
export interface BillingUsage {
  /** Encryption operations used. */
  encryptionOps: number;
  /** Vault entries stored. */
  vaultEntries: number;
  /** API calls made. */
  apiCalls: number;
  /** Storage used in bytes. */
  storageBytes?: number;
  /** ISO 8601 period start. */
  periodStart?: string;
  /** ISO 8601 period end. */
  periodEnd?: string;
}

/** An invoice record. */
export interface Invoice {
  /** Invoice UUID. */
  id: string;
  /** Amount in cents. */
  amountCents: number;
  /** Currency code (e.g. "usd"). */
  currency: string;
  /** Invoice status ("paid", "open", "void"). */
  status: string;
  /** ISO 8601 invoice date. */
  invoiceDate: string;
  /** Download URL for the PDF invoice. */
  pdfUrl?: string;
}

/** Stripe checkout session for plan upgrades. */
export interface CheckoutSession {
  /** Checkout session ID. */
  sessionId: string;
  /** URL to redirect the user to for payment. */
  checkoutUrl: string;
}

/**
 * Billing operations - plan info, usage, invoices, and upgrades.
 *
 * @example
 * ```ts
 * const qs = new QuantaSeal({ apiKey: "qs_test_abc123" });
 * const plan  = await qs.billing.getPlan();
 * const usage = await qs.billing.getUsage();
 * ```
 */
export class BillingResource {
  /** @internal */
  constructor(private readonly transport: Transport) {}

  /**
   * Get the current subscription plan.
   *
   * @returns BillingPlan details.
   */
  async getPlan(): Promise<BillingPlan> {
    const resp = await this.transport.request<{
      tier: string;
      price_per_period?: number;
      interval?: string;
      limits?: Record<string, unknown>;
      renews_at?: string;
    }>("GET", "/api/v2/billing/plan");
    const d = resp.data!;
    return {
      tier: d.tier,
      pricePerPeriod: d.price_per_period,
      interval: d.interval,
      limits: d.limits,
      renewsAt: d.renews_at,
    };
  }

  /**
   * Get current period usage statistics.
   *
   * @returns BillingUsage summary.
   */
  async getUsage(): Promise<BillingUsage> {
    const resp = await this.transport.request<{
      encryption_ops: number;
      vault_entries: number;
      api_calls: number;
      storage_bytes?: number;
      period_start?: string;
      period_end?: string;
    }>("GET", "/api/v2/billing/usage");
    const d = resp.data!;
    return {
      encryptionOps: d.encryption_ops,
      vaultEntries: d.vault_entries,
      apiCalls: d.api_calls,
      storageBytes: d.storage_bytes,
      periodStart: d.period_start,
      periodEnd: d.period_end,
    };
  }

  /**
   * List all invoices for the current tenant.
   *
   * @returns Array of Invoice objects.
   */
  async listInvoices(): Promise<Invoice[]> {
    const resp = await this.transport.request<Array<{
      id: string;
      amount_cents: number;
      currency: string;
      status: string;
      invoice_date: string;
      pdf_url?: string;
    }>>("GET", "/api/v2/billing/invoices");
    return (resp.data ?? []).map((d) => ({
      id: d.id,
      amountCents: d.amount_cents,
      currency: d.currency,
      status: d.status,
      invoiceDate: d.invoice_date,
      pdfUrl: d.pdf_url,
    }));
  }

  /**
   * Upgrade the subscription to a new plan tier.
   *
   * @param tier - Target plan tier identifier.
   * @returns Updated BillingPlan.
   */
  async upgradePlan(tier: string): Promise<BillingPlan> {
    const resp = await this.transport.request<{
      tier: string;
      price_per_period?: number;
      interval?: string;
      limits?: Record<string, unknown>;
      renews_at?: string;
    }>("POST", "/api/v2/billing/plan/upgrade", { json: { tier } });
    const d = resp.data!;
    return {
      tier: d.tier,
      pricePerPeriod: d.price_per_period,
      interval: d.interval,
      limits: d.limits,
      renewsAt: d.renews_at,
    };
  }

  /**
   * Create a Stripe checkout session for upgrading the plan.
   *
   * @param tier - Target plan tier identifier.
   * @returns CheckoutSession with a redirect URL.
   */
  async getCheckoutSession(tier: string): Promise<CheckoutSession> {
    const resp = await this.transport.request<{
      session_id: string;
      checkout_url: string;
    }>("POST", "/api/v2/billing/checkout", { json: { tier } });
    const d = resp.data!;
    return { sessionId: d.session_id, checkoutUrl: d.checkout_url };
  }

  /**
   * Cancel the current subscription at the end of the billing period.
   */
  async cancelSubscription(): Promise<void> {
    await this.transport.requestRaw("POST", "/api/v2/billing/cancel");
  }
}
