/**
 * Sync resource for managing data synchronisation jobs between
 * QuantaSeal and external integrations.
 */

import type { Transport } from "./transport.js";

/** A sync job definition. */
export interface SyncJob {
  /** UUID of the sync job. */
  id: string;
  /** UUID of the source/target integration. */
  integrationId: string;
  /** Sync direction ("inbound" | "outbound" | "bidirectional"). */
  direction: string;
  /** Cron expression or interval string for scheduling. */
  schedule: string;
  /** Job status ("active", "paused", "error"). */
  status: string;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /** ISO 8601 next scheduled run. */
  nextRunAt?: string;
}

/** A historical sync job execution record. */
export interface SyncJobExecution {
  /** UUID of the execution. */
  id: string;
  /** UUID of the parent sync job. */
  jobId: string;
  /** Execution status ("success", "failure", "running"). */
  status: string;
  /** Number of records processed. */
  recordsProcessed?: number;
  /** Error message if failed. */
  errorMessage?: string;
  /** ISO 8601 start timestamp. */
  startedAt: string;
  /** ISO 8601 end timestamp. */
  completedAt?: string;
}

/** @internal */
function mapJob(d: Record<string, unknown>): SyncJob {
  return {
    id: d.id as string,
    integrationId: d.integration_id as string,
    direction: d.direction as string,
    schedule: d.schedule as string,
    status: d.status as string,
    createdAt: d.created_at as string,
    nextRunAt: d.next_run_at as string | undefined,
  };
}

/**
 * Sync operations - create, list, get, trigger, delete jobs and view history.
 *
 * @example
 * ```ts
 * const qs = new QuantaSeal({ apiKey: "qs_test_abc123" });
 * const job = await qs.sync.createJob("integration-uuid", "outbound", "0 * * * *");
 * await qs.sync.triggerJob(job.id);
 * ```
 */
export class SyncResource {
  /** @internal */
  constructor(private readonly transport: Transport) {}

  /**
   * Create a new sync job.
   *
   * @param integrationId - UUID of the integration to sync with.
   * @param direction - Sync direction ("inbound", "outbound", or "bidirectional").
   * @param schedule - Cron expression or interval (e.g. `"0 * * * *"`, `"@hourly"`).
   * @returns The created SyncJob.
   */
  async createJob(
    integrationId: string,
    direction: string,
    schedule: string,
  ): Promise<SyncJob> {
    const resp = await this.transport.request<Record<string, unknown>>(
      "POST",
      "/api/v2/sync/jobs",
      { json: { integration_id: integrationId, direction, schedule } },
    );
    return mapJob(resp.data!);
  }

  /**
   * List all sync jobs for the current tenant.
   *
   * @returns Array of SyncJob objects.
   */
  async listJobs(): Promise<SyncJob[]> {
    const resp = await this.transport.request<Record<string, unknown>[]>(
      "GET",
      "/api/v2/sync/jobs",
    );
    return (resp.data ?? []).map(mapJob);
  }

  /**
   * Retrieve a single sync job.
   *
   * @param id - UUID of the sync job.
   * @returns SyncJob object.
   */
  async getJob(id: string): Promise<SyncJob> {
    const resp = await this.transport.request<Record<string, unknown>>(
      "GET",
      `/api/v2/sync/jobs/${id}`,
    );
    return mapJob(resp.data!);
  }

  /**
   * Manually trigger an immediate execution of a sync job.
   *
   * @param id - UUID of the sync job to trigger.
   */
  async triggerJob(id: string): Promise<void> {
    await this.transport.requestRaw("POST", `/api/v2/sync/jobs/${id}/trigger`);
  }

  /**
   * Delete a sync job.
   *
   * @param id - UUID of the sync job to delete.
   */
  async deleteJob(id: string): Promise<void> {
    await this.transport.requestRaw("DELETE", `/api/v2/sync/jobs/${id}`);
  }

  /**
   * Get execution history for a sync job.
   *
   * @param id - UUID of the sync job.
   * @returns Array of SyncJobExecution records (most recent first).
   */
  async getJobHistory(id: string): Promise<SyncJobExecution[]> {
    const resp = await this.transport.request<Array<{
      id: string;
      job_id: string;
      status: string;
      records_processed?: number;
      error_message?: string;
      started_at: string;
      completed_at?: string;
    }>>("GET", `/api/v2/sync/jobs/${id}/history`);
    return (resp.data ?? []).map((d) => ({
      id: d.id,
      jobId: d.job_id,
      status: d.status,
      recordsProcessed: d.records_processed,
      errorMessage: d.error_message,
      startedAt: d.started_at,
      completedAt: d.completed_at,
    }));
  }
}
