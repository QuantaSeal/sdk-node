/**
 * Compliance resource for generating and retrieving compliance reports
 * and scores across frameworks (SOC2, GDPR, HIPAA, PCI-DSS, etc.).
 */

import type { Transport } from "./transport.js";

/** A compliance report object. */
export interface ComplianceReport {
  /** UUID of the report. */
  id: string;
  /** Compliance framework name. */
  framework: string;
  /** Report status (e.g. "pending", "complete", "failed"). */
  status: string;
  /** ISO 8601 generation timestamp. */
  createdAt: string;
  /** Download URL or inline report data. */
  reportUrl?: string;
  /** Report summary / findings. */
  summary?: Record<string, unknown>;
}

/** @internal */
interface RawReport {
  id: string;
  framework: string;
  status: string;
  created_at: string;
  report_url?: string;
  summary?: Record<string, unknown>;
}

/** A compliance score for a specific framework. */
export interface ComplianceScore {
  /** Compliance framework name. */
  framework: string;
  /** Numeric score (0–100). */
  score: number;
  /** Score grade letter. */
  grade?: string;
  /** ISO 8601 timestamp when score was last computed. */
  calculatedAt?: string;
  /** Breakdown by control category. */
  breakdown?: Record<string, unknown>;
}

/** @internal */
function mapReport(raw: RawReport): ComplianceReport {
  return {
    id: raw.id,
    framework: raw.framework,
    status: raw.status,
    createdAt: raw.created_at,
    reportUrl: raw.report_url,
    summary: raw.summary,
  };
}

/**
 * Compliance operations - generate reports and compute scores.
 *
 * @example
 * ```ts
 * const qs = new QuantaSeal({ apiKey: "qs_test_abc123" });
 * const report = await qs.compliance.generateReport("SOC2");
 * const score  = await qs.compliance.getScore("GDPR");
 * ```
 */
export class ComplianceResource {
  /** @internal */
  constructor(private readonly transport: Transport) {}

  /**
   * Trigger generation of a compliance report for the given framework.
   *
   * @param framework - Framework identifier (e.g. `"SOC2"`, `"GDPR"`, `"HIPAA"`).
   * @returns The queued or completed ComplianceReport.
   */
  async generateReport(framework: string): Promise<ComplianceReport> {
    const resp = await this.transport.request<RawReport>(
      "POST",
      "/api/v2/compliance/reports",
      { json: { framework } },
    );
    return mapReport(resp.data!);
  }

  /**
   * Retrieve a previously generated report by ID.
   *
   * @param id - UUID of the compliance report.
   * @returns The ComplianceReport.
   */
  async getReport(id: string): Promise<ComplianceReport> {
    const resp = await this.transport.request<RawReport>(
      "GET",
      `/api/v2/compliance/reports/${id}`,
    );
    return mapReport(resp.data!);
  }

  /**
   * List all compliance reports for the current tenant.
   *
   * @returns Array of ComplianceReport objects.
   */
  async listReports(): Promise<ComplianceReport[]> {
    const resp = await this.transport.request<RawReport[]>(
      "GET",
      "/api/v2/compliance/reports",
    );
    return (resp.data ?? []).map(mapReport);
  }

  /**
   * Retrieve the current compliance score for a framework.
   *
   * @param framework - Framework identifier.
   * @returns ComplianceScore with numeric score and optional breakdown.
   */
  async getScore(framework: string): Promise<ComplianceScore> {
    const resp = await this.transport.request<{
      framework: string;
      score: number;
      grade?: string;
      calculated_at?: string;
      breakdown?: Record<string, unknown>;
    }>("GET", `/api/v2/compliance/score/${framework}`);
    const data = resp.data!;
    return {
      framework: data.framework,
      score: data.score,
      grade: data.grade,
      calculatedAt: data.calculated_at,
      breakdown: data.breakdown,
    };
  }
}
