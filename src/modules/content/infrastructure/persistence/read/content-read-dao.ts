import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';

// Import from Core (interfaces)
import type { ICacheService } from '@core/infrastructure';
import { CACHE_SERVICE_TOKEN } from '@core/constants';

// Import from Shared (implementations)
import {
  BaseReadDao,
  DATABASE_READ_TOKEN,
  type DrizzleDB,
  schema,
} from '@shared';

// Import Application DTOs & Ports
import { ContentResponseDto } from '../../../application/dtos';
import { IContentReadDao } from '../../../application/queries/ports';

// Import Infrastructure
import { contentsTable } from '../drizzle/schema';

/**
 * Cache configuration
 */
const CACHE_TTL_SECONDS = 300; // 5 minutes
const CACHE_KEY_PREFIX = 'content:';

/**
 * Content Read DAO Implementation
 *
 * Implements IContentReadDao for read-optimized queries.
 * Extends BaseReadDao for common functionality.
 *
 * ## Features:
 * - Read replica support (via DATABASE_READ_TOKEN)
 * - Optional caching with automatic invalidation
 * - Optimized queries for read operations
 *
 * Following CQRS principles:
 * - Used ONLY by Query Handlers
 * - Returns DTOs directly (never domain entities)
 * - Optimized for read operations with minimal overhead
 *
 * Story 3.1: Create Content Draft - Read Side
 */
@Injectable()
export class ContentReadDao extends BaseReadDao implements IContentReadDao {
  private readonly logger = new Logger(ContentReadDao.name);

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
    sql: string,
    params?: unknown[],
  ): Promise<T[]> {
    const result = await this.db.execute(sql);
    return result.rows as T[];
  }

  /**
   * Find content by ID with caching
   */
  async findById(
    id: string,
    tenantId: string,
  ): Promise<ContentResponseDto | null> {
    // Check cache first
    if (this.cacheService) {
      const cached = await this.cacheService.get<ContentResponseDto>(
        `${CACHE_KEY_PREFIX}${id}`,
      );
      if (cached) {
        this.logger.debug(`Cache HIT: content ${id}`);
        return cached;
      }
    }

    // Query database
    const result = await this.db
      .select()
      .from(contentsTable)
      .where(
        and(eq(contentsTable.id, id), eq(contentsTable.tenantId, tenantId)),
      )
      .limit(1);

    if (!result[0]) {
      return null;
    }

    const content = this.toDto(result[0]);

    // Cache result
    if (this.cacheService && content) {
      await this.cacheService.set(
        `${CACHE_KEY_PREFIX}${id}`,
        content,
        CACHE_TTL_SECONDS,
      );
      this.logger.debug(`Cached content: ${id}`);
    }

    return content;
  }

  /**
   * Find content by author with optional status filter
   */
  async findByAuthor(
    authorId: string,
    tenantId: string,
    status?: string,
  ): Promise<ContentResponseDto[]> {
    const conditions = [
      eq(contentsTable.authorId, authorId),
      eq(contentsTable.tenantId, tenantId),
    ];

    if (status) {
      conditions.push(eq(contentsTable.status, status as any));
    }

    const result = await this.db
      .select()
      .from(contentsTable)
      .where(and(...conditions))
      .orderBy(desc(contentsTable.createdAt));

    return result.map((content) => this.toDto(content));
  }

  /**
   * Invalidate cache for a content
   */
  async invalidateCache(id: string): Promise<void> {
    if (this.cacheService) {
      await this.cacheService.delete(`${CACHE_KEY_PREFIX}${id}`);
      this.logger.debug(`Cache invalidated: content ${id}`);
    }
  }

  /**
   * Invalidate cache for multiple contents
   */
  async invalidateCacheMany(ids: string[]): Promise<void> {
    if (this.cacheService && ids.length > 0) {
      const keys = ids.map((id) => `${CACHE_KEY_PREFIX}${id}`);
      await this.cacheService.mdelete(keys);
      this.logger.debug(`Cache invalidated for ${ids.length} contents`);
    }
  }

  /**
   * Map database record to DTO
   */
  private toDto(record: any): ContentResponseDto {
    return new ContentResponseDto({
      id: record.id,
      tenantId: record.tenantId,
      authorId: record.authorId,
      title: record.title,
      content: record.content,
      excerpt: record.excerpt,
      type: record.type,
      status: record.status,
      priority: record.priority,
      categoryId: record.categoryId,
      tags: (record.tags as string[]) || [],
      featuredImage: record.featuredImage,
      version: record.version,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
