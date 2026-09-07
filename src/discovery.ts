/**
 * Discovery resource for schema discovery and object introspection
 * on connected external system integrations.
 */

import type { Transport } from "./transport.js";

/** A discovered schema summary for an integration. */
export interface SchemaDiscovery {
  /** UUID of the integration. */
  integrationId: string;
  /** List of top-level objects/entities discovered. */
  objects: string[];
  /** ISO 8601 discovery timestamp. */
  discoveredAt: string;
  /** Raw schema metadata. */
  schema?: Record<string, unknown>;
}

/** A discovered object with its fields. */
export interface DiscoveredObject {
  /** Object/entity name. */
  name: string;
  /** Display label. */
  label?: string;
  /** Object-level metadata. */
  metadata?: Record<string, unknown>;
}

/** A field definition within a discovered object. */
export interface ObjectField {
  /** Field name. */
  name: string;
  /** Data type (e.g. "string", "integer", "boolean", "datetime"). */
  dataType: string;
  /** Whether the field is required. */
  required?: boolean;
  /** Whether the field is read-only. */
  readOnly?: boolean;
  /** Field description. */
  description?: string;
}

/**
 * Discovery operations - schema discovery, object listing, and field introspection.
 *
 * @example
 * ```ts
 * const qs = new QuantaSeal({ apiKey: "qs_test_abc123" });
 * const schema = await qs.discovery.discoverSchema("integration-uuid");
 * const fields = await qs.discovery.getObjectFields("integration-uuid", "Account");
 * ```
 */
export class DiscoveryResource {
  /** @internal */
  constructor(private readonly transport: Transport) {}

  /**
   * Trigger schema discovery for an integration.
   *
   * Connects to the external system and enumerates available objects.
   *
   * @param integrationId - UUID of the integration.
   * @returns SchemaDiscovery with list of available objects.
   */
  async discoverSchema(integrationId: string): Promise<SchemaDiscovery> {
    const resp = await this.transport.request<{
      integration_id: string;
      objects: string[];
      discovered_at: string;
      schema?: Record<string, unknown>;
    }>("POST", `/api/v2/discovery/${integrationId}/schema`);
    const d = resp.data!;
    return {
      integrationId: d.integration_id,
      objects: d.objects ?? [],
      discoveredAt: d.discovered_at,
      schema: d.schema,
    };
  }

  /**
   * List all discoverable objects for an integration.
   *
   * @param integrationId - UUID of the integration.
   * @returns Array of DiscoveredObject summaries.
   */
  async listObjects(integrationId: string): Promise<DiscoveredObject[]> {
    const resp = await this.transport.request<Array<{
      name: string;
      label?: string;
      metadata?: Record<string, unknown>;
    }>>("GET", `/api/v2/discovery/${integrationId}/objects`);
    return (resp.data ?? []).map((d) => ({
      name: d.name,
      label: d.label,
      metadata: d.metadata,
    }));
  }

  /**
   * Get field definitions for a specific object.
   *
   * @param integrationId - UUID of the integration.
   * @param objectName - Name of the object to introspect.
   * @returns Array of ObjectField definitions.
   */
  async getObjectFields(
    integrationId: string,
    objectName: string,
  ): Promise<ObjectField[]> {
    const resp = await this.transport.request<Array<{
      name: string;
      data_type: string;
      required?: boolean;
      read_only?: boolean;
      description?: string;
    }>>("GET", `/api/v2/discovery/${integrationId}/objects/${objectName}/fields`);
    return (resp.data ?? []).map((d) => ({
      name: d.name,
      dataType: d.data_type,
      required: d.required,
      readOnly: d.read_only,
      description: d.description,
    }));
  }
}
