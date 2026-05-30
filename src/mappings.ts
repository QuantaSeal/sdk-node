/**
 * Mappings resource for managing field-level transformation rules
 * between source and target objects in integration pipelines.
 */

import type { Transport } from "./transport.js";

/** A single field mapping rule. */
export interface FieldMapping {
  /** Source field name. */
  sourceField: string;
  /** Target field name. */
  targetField: string;
  /** Optional transformation expression. */
  transform?: string;
}

/** A field mapping definition between two objects. */
export interface ObjectMapping {
  /** UUID of the mapping. */
  id: string;
  /** UUID of the integration this mapping belongs to. */
  integrationId: string;
  /** Source object name. */
  sourceObject: string;
  /** Target object name. */
  targetObject: string;
  /** Array of field-level mapping rules. */
  fieldMappings: FieldMapping[];
  /** Whether this mapping is active. */
  isActive: boolean;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /** ISO 8601 last update timestamp. */
  updatedAt?: string;
}

/** @internal */
function mapObjectMapping(d: Record<string, unknown>): ObjectMapping {
  const rawFields = (d.field_mappings as Array<Record<string, unknown>>) ?? [];
  return {
    id: d.id as string,
    integrationId: d.integration_id as string,
    sourceObject: d.source_object as string,
    targetObject: d.target_object as string,
    fieldMappings: rawFields.map((f) => ({
      sourceField: f.source_field as string,
      targetField: f.target_field as string,
      transform: f.transform as string | undefined,
    })),
    isActive: d.is_active as boolean,
    createdAt: d.created_at as string,
    updatedAt: d.updated_at as string | undefined,
  };
}

/**
 * Mappings operations - create, list, get, update, and delete object mappings.
 *
 * @example
 * ```ts
 * const qs = new QuantaSeal({ apiKey: "qs_test_abc123" });
 * const mapping = await qs.mappings.create(
 *   "integration-uuid",
 *   "Contact",
 *   "Lead",
 *   [{ sourceField: "email", targetField: "email_address" }],
 * );
 * ```
 */
export class MappingsResource {
  /** @internal */
  constructor(private readonly transport: Transport) {}

  /**
   * Create a new object mapping for an integration.
   *
   * @param integrationId - UUID of the integration.
   * @param sourceObject - Source object/entity name.
   * @param targetObject - Target object/entity name.
   * @param fieldMappings - Array of field mapping rules.
   * @returns The created ObjectMapping.
   */
  async create(
    integrationId: string,
    sourceObject: string,
    targetObject: string,
    fieldMappings: FieldMapping[],
  ): Promise<ObjectMapping> {
    const resp = await this.transport.request<Record<string, unknown>>(
      "POST",
      "/api/v2/mappings",
      {
        json: {
          integration_id: integrationId,
          source_object: sourceObject,
          target_object: targetObject,
          field_mappings: fieldMappings.map((f) => ({
            source_field: f.sourceField,
            target_field: f.targetField,
            transform: f.transform,
          })),
        },
      },
    );
    return mapObjectMapping(resp.data!);
  }

  /**
   * List all mappings for a specific integration.
   *
   * @param integrationId - UUID of the integration.
   * @returns Array of ObjectMapping objects.
   */
  async list(integrationId: string): Promise<ObjectMapping[]> {
    const resp = await this.transport.request<Record<string, unknown>[]>(
      "GET",
      "/api/v2/mappings",
      { params: { integration_id: integrationId } },
    );
    return (resp.data ?? []).map(mapObjectMapping);
  }

  /**
   * Retrieve a single mapping by ID.
   *
   * @param id - UUID of the mapping.
   * @returns ObjectMapping object.
   */
  async get(id: string): Promise<ObjectMapping> {
    const resp = await this.transport.request<Record<string, unknown>>(
      "GET",
      `/api/v2/mappings/${id}`,
    );
    return mapObjectMapping(resp.data!);
  }

  /**
   * Update an existing mapping.
   *
   * @param id - UUID of the mapping to update.
   * @param updates - Partial updates (fieldMappings, isActive).
   * @returns Updated ObjectMapping.
   */
  async update(
    id: string,
    updates: {
      fieldMappings?: FieldMapping[];
      isActive?: boolean;
    },
  ): Promise<ObjectMapping> {
    const body: Record<string, unknown> = {};
    if (updates.fieldMappings != null) {
      body.field_mappings = updates.fieldMappings.map((f) => ({
        source_field: f.sourceField,
        target_field: f.targetField,
        transform: f.transform,
      }));
    }
    if (updates.isActive != null) body.is_active = updates.isActive;

    const resp = await this.transport.request<Record<string, unknown>>(
      "PATCH",
      `/api/v2/mappings/${id}`,
      { json: body },
    );
    return mapObjectMapping(resp.data!);
  }

  /**
   * Delete a mapping.
   *
   * @param id - UUID of the mapping to delete.
   */
  async delete(id: string): Promise<void> {
    await this.transport.requestRaw("DELETE", `/api/v2/mappings/${id}`);
  }
}
