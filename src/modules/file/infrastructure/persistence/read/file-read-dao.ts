import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import { eq, and, desc, sql, gte, lte, like, isNull } from 'drizzle-orm';
import { BaseReadDao } from '@core/infrastructure';
import type { ICacheService } from '@core/infrastructure';
import { CACHE_SERVICE_TOKEN } from '@core/constants';
import type { DrizzleDB } from '@shared/database/drizzle';
import { DATABASE_READ_TOKEN } from '@shared/database/drizzle';
import { filesTable } from '../drizzle/schema/file.schema';
import type { IFileReadDaoPort } from '../../../application/queries/ports/file-read-dao.interface';
import type { FileDto } from '../../../application/dtos/file.dto';
import type { schema } from '@shared/database/drizzle/schema';

/**
 * Cache configuration
 */
const CACHE_TTL_SECONDS = 300; // 5 minutes
const CACHE_KEY_PREFIX = 'file:';

/**
 * File Read DAO Implementation
 *
 * Implements IFileReadDaoPort for read-optimized queries.
 * Extends BaseReadDao for common functionality.
 *
 * ## Features:
 * - Read replica support (via DATABASE_READ_TOKEN)
 * - Optional caching with automatic invalidation
 * - Optimized queries for read operations
 * - Pagination and filtering support
 *
 * Following CQRS principles:
 * - Used ONLY by Query Handlers
 * - Returns DTOs directly (never domain entities)
 * - Optimized for read operations with minimal overhead
 */
@Injectable()
export class FileReadDao extends BaseReadDao implements IFileReadDaoPort {
  private readonly logger = new Logger(FileReadDao.name);

  constructor(
    @Inject(DATABASE_READ_TOKEN)
    private readonly db: DrizzleDB<typeof schema>,
    @Optional()
    @Inject(CACHE_SERVICE_TOKEN)
    private readonly cacheService?: ICacheService,
  ) {
    super();
  }

  /**
   * Execute raw SQL query (required by BaseReadDao)
   */
  protected async executeQuery<T = unknown>(
    sqlQuery: string,
    params?: unknown[],
  ): Promise<T[]> {
    const result = await this.db.execute(sqlQuery);
    return result.rows as T[];
  }

  /**
   * Find file by ID with caching
   */
  async findById(fileId: string, tenantId: string): Promise<FileDto | null> {
    const cacheKey = `${CACHE_KEY_PREFIX}${fileId}:${tenantId}`;

    // Check cache first
    if (this.cacheService) {
      const cached = await this.cacheService.get<FileDto>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache HIT: file ${fileId}`);
        return cached;
      }
    }

    // Query database (filter out soft-deleted records)
    const result = await this.db
      .select()
      .from(filesTable)
      .where(
        and(
          eq(filesTable.id, fileId),
          eq(filesTable.tenantId, tenantId),
          isNull(filesTable.deletedAt),
        ),
      )
      .limit(1);

    if (!result[0]) {
      return null;
    }

    const file = this.toDto(result[0]);

    // Cache result
    if (this.cacheService && file) {
      await this.cacheService.set(cacheKey, file, CACHE_TTL_SECONDS);
      this.logger.debug(`Cached file: ${fileId}`);
    }

    return file;
  }

  /**
   * Find list of files with filtering and pagination
   */
  async findList(filters: {
    tenantId: string;
    fileType?: string;
    uploadedBy?: string;
    dateFrom?: string;
    dateTo?: string;
    limit: number;
    offset: number;
    sortBy: string;
    sortOrder: string;
  }): Promise<FileDto[]> {
    // Always filter out soft-deleted records
    const conditions: any[] = [
      eq(filesTable.tenantId, filters.tenantId),
      isNull(filesTable.deletedAt),
    ];

    // Apply file type filter
    if (filters.fileType) {
      conditions.push(eq(filesTable.fileType, filters.fileType));
    }

    // Apply uploaded by filter
    if (filters.uploadedBy) {
      conditions.push(eq(filesTable.uploadedBy, filters.uploadedBy));
    }

    // Apply date range filter
    if (filters.dateFrom) {
      conditions.push(gte(filesTable.createdAt, new Date(filters.dateFrom)));
    }

    if (filters.dateTo) {
      conditions.push(lte(filesTable.createdAt, new Date(filters.dateTo)));
    }

    // Build query
    let query = this.db.select().from(filesTable);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    // Apply sorting with column mapping
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = (filters.sortOrder || 'DESC').toUpperCase();

    // Map sortBy parameter to database column
    let orderByColumn;
    switch (sortBy) {
      case 'fileName':
        orderByColumn = filesTable.originalFileName;
        break;
      case 'size':
        orderByColumn = filesTable.fileSize;
        break;
      case 'updatedAt':
        orderByColumn = filesTable.updatedAt;
        break;
      case 'fileType':
        orderByColumn = filesTable.fileType;
        break;
      case 'mimeType':
        orderByColumn = filesTable.mimeType;
        break;
      case 'createdAt':
      default:
        orderByColumn = filesTable.createdAt;
        break;
    }

    if (sortOrder === 'DESC') {
      query = query.orderBy(desc(orderByColumn)) as any;
    } else {
      query = query.orderBy(orderByColumn) as any;
    }

    // Apply pagination
    query = query.limit(filters.limit).offset(filters.offset) as any;

    const data = await query;

    return data.map((file) => this.toDto(file));
  }

  /**
   * Count files matching filters
   */
  async count(filters: {
    tenantId: string;
    fileType?: string;
    uploadedBy?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<number> {
    // Always filter out soft-deleted records
    const conditions: any[] = [
      eq(filesTable.tenantId, filters.tenantId),
      isNull(filesTable.deletedAt),
    ];

    // Apply file type filter
    if (filters.fileType) {
      conditions.push(eq(filesTable.fileType, filters.fileType));
    }

    // Apply uploaded by filter
    if (filters.uploadedBy) {
      conditions.push(eq(filesTable.uploadedBy, filters.uploadedBy));
    }

    // Apply date range filter
    if (filters.dateFrom) {
      conditions.push(gte(filesTable.createdAt, new Date(filters.dateFrom)));
    }

    if (filters.dateTo) {
      conditions.push(lte(filesTable.createdAt, new Date(filters.dateTo)));
    }

    // Build count query
    const countQuery = this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(filesTable);

    const [{ count }] =
      conditions.length > 0
        ? await countQuery.where(and(...conditions))
        : await countQuery;

    return count;
  }

  /**
   * Invalidate cache for a file
   */
  async invalidateCache(fileId: string, tenantId: string): Promise<void> {
    if (this.cacheService) {
      const cacheKey = `${CACHE_KEY_PREFIX}${fileId}:${tenantId}`;
      await this.cacheService.delete(cacheKey);
      this.logger.debug(`Cache invalidated: file ${fileId}`);
    }
  }

  /**
   * Invalidate cache for multiple files
   */
  async invalidateCacheMany(
    fileIds: string[],
    tenantId: string,
  ): Promise<void> {
    if (this.cacheService && fileIds.length > 0) {
      const keys = fileIds.map((id) => `${CACHE_KEY_PREFIX}${id}:${tenantId}`);
      await this.cacheService.mdelete(keys);
      this.logger.debug(`Cache invalidated for ${fileIds.length} files`);
    }
  }

  /**
   * Convert database record to DTO
   */
  private toDto(record: any): FileDto {
    return {
      id: record.id,
      tenantId: record.tenantId,
      originalFileName: record.originalFileName,
      mimeType: record.mimeType,
      fileSize: Number(record.fileSize),
      fileType: record.fileType,
      storagePath: record.storagePath,
      storageProvider: record.storageProvider,
      processedPath: record.processedPath,
      thumbnailPath: record.thumbnailPath,
      processedMetadata: record.processedMetadata,
      uploadedBy: record.uploadedBy,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
