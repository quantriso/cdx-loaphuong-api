import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import { eq, and, asc, sql } from 'drizzle-orm';

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
import { TagResponseDto } from '../../../application/dtos';
import { ITagReadDao } from '../../../application/queries/ports';

// Import Infrastructure
import { tagsTable } from '../drizzle/schema';

/**
 * Cache configuration
 */
const CACHE_TTL_SECONDS = 300; // 5 minutes
const CACHE_KEY_PREFIX = 'tag:';

/**
 * Tag Read DAO Implementation
 *
 * Implements ITagReadDao for read-optimized queries.
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
 * Story 4.3: Create, Edit, Delete Tags - Read Side
 */
@Injectable()
export class TagReadDao extends BaseReadDao implements ITagReadDao {
  private readonly logger = new Logger(TagReadDao.name);

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
   * Find tag by ID with caching
   */
  async findById(
    id: string,
    tenantId: string,
  ): Promise<TagResponseDto | null> {
    // Check cache first
    if (this.cacheService) {
      const cached = await this.cacheService.get<TagResponseDto>(
        `${CACHE_KEY_PREFIX}${id}`,
      );
      if (cached) {
        this.logger.debug(`Cache HIT: tag ${id}`);
        return cached;
      }
    }

    // Query database
    const result = await this.db
      .select()
      .from(tagsTable)
      .where(
        and(
          eq(tagsTable.id, id),
          eq(tagsTable.tenantId, tenantId),
          eq(tagsTable.isDeleted, false),
        ),
      )
      .limit(1);

    if (!result[0]) {
      return null;
    }

    const tag = this.toDto(result[0]);

    // Cache result
    if (this.cacheService && tag) {
      await this.cacheService.set(
        `${CACHE_KEY_PREFIX}${id}`,
        tag,
        CACHE_TTL_SECONDS,
      );
      this.logger.debug(`Cached tag: ${id}`);
    }

    return tag;
  }

  /**
   * Find all tags with optional filters and pagination
   */
  async findAll(
    tenantId: string,
    isActive?: boolean,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ data: TagResponseDto[]; total: number }> {
    // Build where conditions
    const conditions = [
      eq(tagsTable.tenantId, tenantId),
      eq(tagsTable.isDeleted, false),
    ];

    if (isActive !== undefined) {
      conditions.push(eq(tagsTable.isActive, isActive));
    }

    const whereClause = and(...conditions);

    // Get total count
    const countResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(tagsTable)
      .where(whereClause);

    const total = Number(countResult[0]?.count || 0);

    // Get paginated data
    const offset = (page - 1) * limit;
    const result = await this.db
      .select()
      .from(tagsTable)
      .where(whereClause)
      .orderBy(asc(tagsTable.name))
      .limit(limit)
      .offset(offset);

    return {
      data: result.map((row) => this.toDto(row)),
      total,
    };
  }

  /**
   * Find active tags for dropdowns
   */
  async findActive(tenantId: string): Promise<TagResponseDto[]> {
    const result = await this.db
      .select()
      .from(tagsTable)
      .where(
        and(
          eq(tagsTable.tenantId, tenantId),
          eq(tagsTable.isActive, true),
          eq(tagsTable.isDeleted, false),
        ),
      )
      .orderBy(asc(tagsTable.name));

    return result.map((row) => this.toDto(row));
  }

  /**
   * Invalidate cache for a tag
   */
  async invalidateCache(id: string): Promise<void> {
    if (this.cacheService) {
      await this.cacheService.delete(`${CACHE_KEY_PREFIX}${id}`);
      this.logger.debug(`Cache invalidated: tag ${id}`);
    }
  }

  /**
   * Invalidate cache for multiple tags
   */
  async invalidateCacheMany(ids: string[]): Promise<void> {
    if (this.cacheService && ids.length > 0) {
      const keys = ids.map((id) => `${CACHE_KEY_PREFIX}${id}`);
      await this.cacheService.mdelete(keys);
      this.logger.debug(`Cache invalidated for ${ids.length} tags`);
    }
  }

  /**
   * Map database record to DTO
   */
  private toDto(record: any): TagResponseDto {
    return new TagResponseDto({
      id: record.id,
      tenantId: record.tenantId,
      name: record.name,
      slug: record.slug,
      description: record.description,
      color: record.color,
      isActive: record.isActive,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      createdBy: record.createdBy,
      updatedBy: record.updatedBy,
    });
  }
}
