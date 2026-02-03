import { Injectable, Logger } from '@nestjs/common';
import { IStorageService } from './storage.interface';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Local Filesystem Storage Provider
 *
 * Implements IStorageService using local filesystem.
 * Files are stored in a configurable base directory.
 *
 * Directory structure for Story 5.3 (Image Processing):
 * <baseDir>/
 *   <tenantId>/
 *     <filename>              (original uploaded file)
 *     processed/               (processed images)
 *       <storageKey>.webp
 *     thumbnails/             (thumbnail images)
 *       <storageKey>_thumb.webp
 *
 * The saveFile method supports subdirectories in the filename parameter.
 * For example: filename="processed/image.webp" will create a "processed" folder.
 */
@Injectable()
export class LocalStorageProvider implements IStorageService {
  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly baseDir: string;

  constructor() {
    // Use environment variable or default to 'uploads' directory
    this.baseDir = process.env.LOCAL_STORAGE_PATH || './uploads';
    this.ensureBaseDirectory();
  }

  /**
   * Save a file to local storage
   */
  async saveFile(
    tenantId: string,
    buffer: Buffer,
    filename: string,
  ): Promise<string> {
    try {
      const tenantDir = path.join(this.baseDir, tenantId);
      const filePath = path.join(tenantDir, filename);

      this.logger.debug(`Saving file: ${filePath} (${buffer.length} bytes)`);

      // Ensure directory exists (including subdirectories)
      const directory = path.dirname(filePath);
      await fs.mkdir(directory, { recursive: true });

      // Write file
      await fs.writeFile(filePath, buffer);

      this.logger.debug(`File saved successfully: ${filePath}`);

      // Return storage path (tenantId/filename format)
      return `${tenantId}/${filename}`;
    } catch (error) {
      this.logger.error(
        `Failed to save file ${filename} for tenant ${tenantId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get a file from local storage
   */
  async getFile(storagePath: string): Promise<Buffer> {
    try {
      const filePath = path.join(this.baseDir, storagePath);

      this.logger.debug(`Reading file: ${filePath}`);

      // Check if file exists
      const exists = await this.fileExists(storagePath);
      if (!exists) {
        throw new Error(`File not found: ${storagePath}`);
      }

      // Read file
      const buffer = await fs.readFile(filePath);

      this.logger.debug(
        `File read successfully: ${filePath} (${buffer.length} bytes)`,
      );

      return buffer;
    } catch (error) {
      this.logger.error(`Failed to get file ${storagePath}`, error);
      throw error;
    }
  }

  /**
   * Delete a file from local storage
   */
  async deleteFile(storagePath: string): Promise<void> {
    try {
      const filePath = path.join(this.baseDir, storagePath);

      this.logger.debug(`Deleting file: ${filePath}`);

      // Check if file exists
      const exists = await this.fileExists(storagePath);
      if (!exists) {
        this.logger.warn(`File not found for deletion: ${storagePath}`);
        return;
      }

      // Delete file
      await fs.unlink(filePath);

      this.logger.debug(`File deleted successfully: ${filePath}`);
    } catch (error) {
      this.logger.error(`Failed to delete file ${storagePath}`, error);
      throw error;
    }
  }

  /**
   * Check if a file exists in local storage
   */
  async fileExists(storagePath: string): Promise<boolean> {
    try {
      const filePath = path.join(this.baseDir, storagePath);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate a presigned URL for downloading a file
   *
   * Note: For local storage, this returns a simple file URL.
   * In production with MinIO/S3, this would generate a proper presigned URL with expiration.
   *
   * @param storagePath - Storage path/key of the file
   * @param expiresIn - Expiration time in seconds (not used in local storage)
   * @returns File URL
   */
  async generatePresignedUrl(
    storagePath: string,
    expiresIn: number = 900,
  ): Promise<string> {
    try {
      // Check if file exists
      const exists = await this.fileExists(storagePath);
      if (!exists) {
        throw new Error(`File not found: ${storagePath}`);
      }

      // For local storage, return a simple URL
      // In production with MinIO, this would generate a presigned URL with signature
      // URL format: http://localhost:3000/files/download?path=<storagePath>
      const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
      const downloadUrl = `${baseUrl}/files/download?path=${encodeURIComponent(storagePath)}`;

      this.logger.debug(`Generated download URL for ${storagePath}`);

      return downloadUrl;
    } catch (error) {
      this.logger.error(
        `Failed to generate presigned URL for ${storagePath}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Ensure base directory exists
   */
  private async ensureBaseDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
      this.logger.debug(`Base directory ready: ${this.baseDir}`);
    } catch (error) {
      this.logger.error(
        `Failed to create base directory: ${this.baseDir}`,
        error,
      );
      throw error;
    }
  }
}
