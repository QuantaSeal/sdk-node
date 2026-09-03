/**
 * MFT (Managed File Transfer) resource for encrypted file transfers.
 *
 * Provides upload, download, and transfer lifecycle management with
 * optional PQC encryption for files in transit and at rest.
 */

import type { Transport } from "./transport.js";

/** A file transfer record. */
export interface FileTransfer {
  /** UUID of the transfer. */
  id: string;
  /** Original filename. */
  filename: string;
  /** Destination path or identifier. */
  destination: string;
  /** Transfer status ("pending", "in_progress", "complete", "failed"). */
  status: string;
  /** File size in bytes. */
  sizeBytes?: number;
  /** Whether the file was encrypted at rest. */
  encrypted: boolean;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /** ISO 8601 completion timestamp. */
  completedAt?: string;
}

/** @internal */
function mapTransfer(d: Record<string, unknown>): FileTransfer {
  return {
    id: d.id as string,
    filename: d.filename as string,
    destination: d.destination as string,
    status: d.status as string,
    sizeBytes: d.size_bytes as number | undefined,
    encrypted: d.encrypted as boolean,
    createdAt: d.created_at as string,
    completedAt: d.completed_at as string | undefined,
  };
}

/**
 * MFT operations - upload, download, list, get, delete transfers.
 *
 * @example
 * ```ts
 * const qs = new QuantaSeal({ apiKey: "qs_test_abc123" });
 * const transfer = await qs.mft.upload(fileBytes, "report.pdf", "/uploads/", true);
 * const { data } = await qs.mft.download(transfer.id);
 * ```
 */
export class MftResource {
  /** @internal */
  constructor(private readonly transport: Transport) {}

  /**
   * Upload a file for managed transfer.
   *
   * @param fileData - File content as Buffer or base64-encoded string.
   * @param filename - Original filename.
   * @param destination - Target path or destination identifier.
   * @param encrypt - Encrypt the file at rest using PQC (default `true`).
   * @returns The created FileTransfer record.
   */
  async upload(
    fileData: Buffer | string,
    filename: string,
    destination: string,
    encrypt = true,
  ): Promise<FileTransfer> {
    const fileBase64 =
      typeof fileData === "string"
        ? fileData
        : Buffer.from(fileData).toString("base64");

    const resp = await this.transport.request<Record<string, unknown>>(
      "POST",
      "/api/v2/mft/upload",
      {
        json: {
          file_data: fileBase64,
          filename,
          destination,
          encrypt,
        },
      },
    );
    return mapTransfer(resp.data!);
  }

  /**
   * Download a file by transfer ID.
   *
   * @param transferId - UUID of the transfer.
   * @returns Object with base64-encoded file data and filename.
   */
  async download(
    transferId: string,
  ): Promise<{ data: string; filename: string }> {
    const resp = await this.transport.request<{
      data: string;
      filename: string;
    }>("GET", `/api/v2/mft/transfers/${transferId}/download`);
    return { data: resp.data!.data, filename: resp.data!.filename };
  }

  /**
   * List all file transfers for the current tenant.
   *
   * @returns Array of FileTransfer records.
   */
  async listTransfers(): Promise<FileTransfer[]> {
    const resp = await this.transport.request<Record<string, unknown>[]>(
      "GET",
      "/api/v2/mft/transfers",
    );
    return (resp.data ?? []).map(mapTransfer);
  }

  /**
   * Retrieve a single transfer record.
   *
   * @param id - UUID of the transfer.
   * @returns FileTransfer record.
   */
  async getTransfer(id: string): Promise<FileTransfer> {
    const resp = await this.transport.request<Record<string, unknown>>(
      "GET",
      `/api/v2/mft/transfers/${id}`,
    );
    return mapTransfer(resp.data!);
  }

  /**
   * Delete a transfer and its associated file data.
   *
   * @param id - UUID of the transfer to delete.
   */
  async deleteTransfer(id: string): Promise<void> {
    await this.transport.requestRaw("DELETE", `/api/v2/mft/transfers/${id}`);
  }
}
