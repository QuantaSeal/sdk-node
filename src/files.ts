/**
 * Files resource for general file storage with optional PQC encryption.
 *
 * Separate from MFT (which handles transfer workflows), this resource
 * provides simple upload/download/list/delete for arbitrary files.
 */

import type { Transport } from "./transport.js";

/** File metadata (no file content). */
export interface FileMetadata {
  /** UUID of the stored file. */
  id: string;
  /** Original filename. */
  filename: string;
  /** MIME content type. */
  contentType?: string;
  /** File size in bytes. */
  sizeBytes?: number;
  /** Whether the file is PQC-encrypted at rest. */
  encrypted: boolean;
  /** ISO 8601 upload timestamp. */
  createdAt: string;
}

/** @internal */
function mapMeta(d: Record<string, unknown>): FileMetadata {
  return {
    id: d.id as string,
    filename: d.filename as string,
    contentType: d.content_type as string | undefined,
    sizeBytes: d.size_bytes as number | undefined,
    encrypted: d.encrypted as boolean,
    createdAt: d.created_at as string,
  };
}

/**
 * Files operations - upload, download, list, delete, getMetadata.
 *
 * @example
 * ```ts
 * const qs = new QuantaSeal({ apiKey: "qs_test_abc123" });
 * const meta = await qs.files.upload(buffer, "document.pdf", true);
 * const { data } = await qs.files.download(meta.id);
 * ```
 */
export class FilesResource {
  /** @internal */
  constructor(private readonly transport: Transport) {}

  /**
   * Upload a file, optionally encrypting it at rest.
   *
   * @param fileData - File content as Buffer or base64-encoded string.
   * @param filename - Original filename (used for download).
   * @param encrypt - Encrypt the file with PQC before storing (default `true`).
   * @returns FileMetadata for the uploaded file.
   */
  async upload(
    fileData: Buffer | string,
    filename: string,
    encrypt = true,
  ): Promise<FileMetadata> {
    const fileBase64 =
      typeof fileData === "string"
        ? fileData
        : Buffer.from(fileData).toString("base64");

    const resp = await this.transport.request<Record<string, unknown>>(
      "POST",
      "/api/v2/files/upload",
      { json: { file_data: fileBase64, filename, encrypt } },
    );
    return mapMeta(resp.data!);
  }

  /**
   * Download a file by ID.
   *
   * @param fileId - UUID of the file.
   * @returns Object with base64-encoded file data and original filename.
   */
  async download(fileId: string): Promise<{ data: string; filename: string }> {
    const resp = await this.transport.request<{
      data: string;
      filename: string;
    }>("GET", `/api/v2/files/${fileId}/download`);
    return { data: resp.data!.data, filename: resp.data!.filename };
  }

  /**
   * List all files stored for the current tenant.
   *
   * @returns Array of FileMetadata objects (no file content).
   */
  async list(): Promise<FileMetadata[]> {
    const resp = await this.transport.request<Record<string, unknown>[]>(
      "GET",
      "/api/v2/files",
    );
    return (resp.data ?? []).map(mapMeta);
  }

  /**
   * Delete a file and its encrypted data.
   *
   * @param fileId - UUID of the file to delete.
   */
  async delete(fileId: string): Promise<void> {
    await this.transport.requestRaw("DELETE", `/api/v2/files/${fileId}`);
  }

  /**
   * Get metadata for a single file without downloading its content.
   *
   * @param fileId - UUID of the file.
   * @returns FileMetadata object.
   */
  async getMetadata(fileId: string): Promise<FileMetadata> {
    const resp = await this.transport.request<Record<string, unknown>>(
      "GET",
      `/api/v2/files/${fileId}`,
    );
    return mapMeta(resp.data!);
  }
}
