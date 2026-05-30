/**
 * Workflows resource for building, managing, and executing automated
 * security and data processing workflows.
 */

import type { Transport } from "./transport.js";

/** A workflow definition. */
export interface Workflow {
  /** UUID of the workflow. */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Trigger configuration. */
  trigger: Record<string, unknown>;
  /** Ordered list of workflow steps. */
  steps: Record<string, unknown>[];
  /** Whether the workflow is active. */
  isActive: boolean;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /** ISO 8601 last modification timestamp. */
  updatedAt?: string;
}

/** A workflow execution record. */
export interface WorkflowExecution {
  /** UUID of the execution. */
  id: string;
  /** UUID of the parent workflow. */
  workflowId: string;
  /** Execution status ("running", "success", "failure", "cancelled"). */
  status: string;
  /** Input payload that triggered this execution. */
  payload?: Record<string, unknown>;
  /** Execution output (if available). */
  output?: Record<string, unknown>;
  /** Error message (if failed). */
  errorMessage?: string;
  /** ISO 8601 start timestamp. */
  startedAt: string;
  /** ISO 8601 completion timestamp. */
  completedAt?: string;
}

/** @internal */
function mapWorkflow(d: Record<string, unknown>): Workflow {
  return {
    id: d.id as string,
    name: d.name as string,
    trigger: (d.trigger as Record<string, unknown>) ?? {},
    steps: (d.steps as Record<string, unknown>[]) ?? [],
    isActive: d.is_active as boolean,
    createdAt: d.created_at as string,
    updatedAt: d.updated_at as string | undefined,
  };
}

/**
 * Workflow operations - create, list, get, trigger, update, delete, and
 * inspect executions.
 *
 * @example
 * ```ts
 * const qs = new QuantaSeal({ apiKey: "qs_test_abc123" });
 * const wf = await qs.workflows.create("Encrypt on Upload", { type: "file_upload" }, [
 *   { action: "encrypt", algorithm: "ML-KEM-768" },
 * ]);
 * await qs.workflows.trigger(wf.id, { filename: "report.pdf" });
 * ```
 */
export class WorkflowsResource {
  /** @internal */
  constructor(private readonly transport: Transport) {}

  /**
   * Create a new workflow.
   *
   * @param name - Human-readable workflow name.
   * @param trigger - Trigger configuration object.
   * @param steps - Ordered array of step definitions.
   * @returns The created Workflow.
   */
  async create(
    name: string,
    trigger: Record<string, unknown>,
    steps: Record<string, unknown>[],
  ): Promise<Workflow> {
    const resp = await this.transport.request<Record<string, unknown>>(
      "POST",
      "/api/v2/workflows",
      { json: { name, trigger, steps } },
    );
    return mapWorkflow(resp.data!);
  }

  /**
   * List all workflows for the current tenant.
   *
   * @returns Array of Workflow objects.
   */
  async list(): Promise<Workflow[]> {
    const resp = await this.transport.request<Record<string, unknown>[]>(
      "GET",
      "/api/v2/workflows",
    );
    return (resp.data ?? []).map(mapWorkflow);
  }

  /**
   * Retrieve a single workflow.
   *
   * @param id - UUID of the workflow.
   * @returns Workflow object.
   */
  async get(id: string): Promise<Workflow> {
    const resp = await this.transport.request<Record<string, unknown>>(
      "GET",
      `/api/v2/workflows/${id}`,
    );
    return mapWorkflow(resp.data!);
  }

  /**
   * Manually trigger a workflow execution.
   *
   * @param id - UUID of the workflow.
   * @param payload - Optional input payload for this execution.
   * @returns The resulting WorkflowExecution record.
   */
  async trigger(
    id: string,
    payload?: Record<string, unknown>,
  ): Promise<WorkflowExecution> {
    const resp = await this.transport.request<{
      id: string;
      workflow_id: string;
      status: string;
      payload?: Record<string, unknown>;
      output?: Record<string, unknown>;
      error_message?: string;
      started_at: string;
      completed_at?: string;
    }>("POST", `/api/v2/workflows/${id}/trigger`, {
      json: payload ?? {},
    });
    const d = resp.data!;
    return {
      id: d.id,
      workflowId: d.workflow_id,
      status: d.status,
      payload: d.payload,
      output: d.output,
      errorMessage: d.error_message,
      startedAt: d.started_at,
      completedAt: d.completed_at,
    };
  }

  /**
   * Update an existing workflow's definition.
   *
   * @param id - UUID of the workflow to update.
   * @param updates - Partial updates (name, trigger, steps, isActive).
   * @returns Updated Workflow.
   */
  async update(
    id: string,
    updates: {
      name?: string;
      trigger?: Record<string, unknown>;
      steps?: Record<string, unknown>[];
      isActive?: boolean;
    },
  ): Promise<Workflow> {
    const body: Record<string, unknown> = {};
    if (updates.name != null) body.name = updates.name;
    if (updates.trigger != null) body.trigger = updates.trigger;
    if (updates.steps != null) body.steps = updates.steps;
    if (updates.isActive != null) body.is_active = updates.isActive;

    const resp = await this.transport.request<Record<string, unknown>>(
      "PATCH",
      `/api/v2/workflows/${id}`,
      { json: body },
    );
    return mapWorkflow(resp.data!);
  }

  /**
   * Delete a workflow.
   *
   * @param id - UUID of the workflow to delete.
   */
  async delete(id: string): Promise<void> {
    await this.transport.requestRaw("DELETE", `/api/v2/workflows/${id}`);
  }

  /**
   * Get execution history for a workflow.
   *
   * @param id - UUID of the workflow.
   * @returns Array of WorkflowExecution records (most recent first).
   */
  async getExecutions(id: string): Promise<WorkflowExecution[]> {
    const resp = await this.transport.request<Array<{
      id: string;
      workflow_id: string;
      status: string;
      payload?: Record<string, unknown>;
      output?: Record<string, unknown>;
      error_message?: string;
      started_at: string;
      completed_at?: string;
    }>>("GET", `/api/v2/workflows/${id}/executions`);
    return (resp.data ?? []).map((d) => ({
      id: d.id,
      workflowId: d.workflow_id,
      status: d.status,
      payload: d.payload,
      output: d.output,
      errorMessage: d.error_message,
      startedAt: d.started_at,
      completedAt: d.completed_at,
    }));
  }
}
