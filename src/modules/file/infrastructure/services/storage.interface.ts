/**
 * Storage Service Interface
 *
 * Abstract interface for file storage operations.
 * Can be implemented for local filesystem, S3, Azure Blob Storage, etc.
 */

export interface IStorageService {
  /**
   * Save a file to storage
   * @param tenantId - Tenant ID for multi-tenancy
   * @param buffer - File buffer to save
   * @param filename - Filename to save
   * @returns Storage path/key of the saved file
   */
  saveFile(tenantId: string, buffer: Buffer, filename: string): Promise<string>;

  /**
   * Get a file from storage
   * @param storagePath - Storage path/key of the file
   * @returns File buffer
   */
  getFile(storagePath: string): Promise<Buffer>;

  /**
   * Delete a file from storage
   * @param storagePath - Storage path/key of the file
   */
  deleteFile(storagePath: string): Promise<void>;

  /**
   * Check if a file exists in storage
   * @param storagePath - Storage path/key of the file
   * @returns True if file exists
   */
  fileExists(storagePath: string): Promise<boolean>;

  /**
   * Generate a presigned URL for downloading a file
   * @param storagePath - Storage path/key of the file
   * @param expiresIn - Expiration time in seconds (default: 900 = 15 minutes)
   * @returns Presigned URL string
   */
  generatePresignedUrl(
    storagePath: string,
    expiresIn?: number,
  ): Promise<string>;
}
