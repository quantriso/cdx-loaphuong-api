import type { FileDto } from '../../dtos/file.dto';

/**
 * File Read DAO Port Interface
 *
 * Defines the contract for read operations on the File module.
 * This is part of CQRS pattern - separating read from write operations.
 *
 * ## Architecture
 *
 * - **Pattern**: CQRS (Command Query Responsibility Segregation)
 * - **Purpose**: Optimize read operations independently from writes
 * - **Location**: Application layer (Ports)
 *
 * ## Methods
 *
 * - `findById`: Get a single file by ID
 * - `findList`: Get a list of files with filtering and pagination
 * - `count`: Count files matching filters
 */
export interface IFileReadDaoPort {
  /**
   * Find a file by ID and tenant ID
   *
   * @param fileId - File ID
   * @param tenantId - Tenant ID for multi-tenancy
   * @returns File DTO or null if not found
   */
  findById(fileId: string, tenantId: string): Promise<FileDto | null>;

  /**
   * Find list of files with filtering and pagination
   *
   * @param filters - Filter criteria
   * @returns Array of File DTOs
   */
  findList(filters: {
    tenantId: string;
    fileType?: string;
    uploadedBy?: string;
    dateFrom?: string;
    dateTo?: string;
    limit: number;
    offset: number;
    sortBy: string;
    sortOrder: string;
  }): Promise<FileDto[]>;

  /**
   * Count files matching filters
   *
   * @param filters - Filter criteria
   * @returns Total count of files
   */
  count(filters: {
    tenantId: string;
    fileType?: string;
    uploadedBy?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<number>;

  /**
   * Invalidate cache for a specific file
   *
   * @param fileId - File ID
   * @param tenantId - Tenant ID
   */
  invalidateCache(fileId: string, tenantId: string): Promise<void>;

  /**
   * Invalidate cache for multiple files
   *
   * @param fileIds - Array of file IDs
   * @param tenantId - Tenant ID
   */
  invalidateCacheMany(fileIds: string[], tenantId: string): Promise<void>;
}
