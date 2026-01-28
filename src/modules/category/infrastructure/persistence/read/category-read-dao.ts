import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import { eq, and, desc, asc, isNull, sql } from 'drizzle-orm';

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
import { CategoryResponseDto } from '../../../application/dtos';
import { ICategoryReadDao } from '../../../application/queries/ports';

// Import Infrastructure
import { categoriesTable } from '../drizzle/schema';

/**
 * Cache configuration
 */
const CACHE_TTL_SECONDS = 300; // 5 minutes
const CACHE_KEY_PREFIX = 'category:';

/**
 * Category Read DAO Implementation
 *
 * Implements ICategoryReadDao for read-optimized queries.
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
 * Story 4.1: Manage Categories - Read Side
 */
@Injectable()
export class CategoryReadDao extends BaseReadDao implements ICategoryReadDao {
  private readonly logger = new Logger(CategoryReadDao.name);

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
   * Find category by ID with caching
   */
  async findById(
    id: string,
    tenantId: string,
  ): Promise<CategoryResponseDto | null> {
    // Check cache first
    if (this.cacheService) {
      const cached = await this.cacheService.get<CategoryResponseDto>(
        `${CACHE_KEY_PREFIX}${id}`,
      );
      if (cached) {
        this.logger.debug(`Cache HIT: category ${id}`);
        return cached;
      }
    }

    // Query database
    const result = await this.db
      .select()
      .from(categoriesTable)
      .where(
        and(
          eq(categoriesTable.id, id),
          eq(categoriesTable.tenantId, tenantId),
          eq(categoriesTable.isDeleted, false),
        ),
      )
      .limit(1);

    if (!result[0]) {
      return null;
    }

    const category = this.toDto(result[0]);

    // Cache result
    if (this.cacheService && category) {
      await this.cacheService.set(
        `${CACHE_KEY_PREFIX}${id}`,
        category,
        CACHE_TTL_SECONDS,
      );
      this.logger.debug(`Cached category: ${id}`);
    }

    return category;
  }

  /**
   * Find all categories with optional filters and pagination
   */
  async findAll(
    tenantId: string,
    isActive?: boolean,
    parentId?: string | null,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ data: CategoryResponseDto[]; total: number }> {
    // Build where conditions
    const conditions = [
      eq(categoriesTable.tenantId, tenantId),
      eq(categoriesTable.isDeleted, false),
    ];

    if (isActive !== undefined) {
      conditions.push(eq(categoriesTable.isActive, isActive));
    }

    if (parentId !== undefined) {
      if (parentId === null) {
        conditions.push(isNull(categoriesTable.parentId));
      } else {
        conditions.push(eq(categoriesTable.parentId, parentId));
      }
    }

    const whereClause = and(...conditions);

    // Get total count
    const countResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(categoriesTable)
      .where(whereClause);

    const total = Number(countResult[0]?.count || 0);

    // Get paginated data
    const offset = (page - 1) * limit;
    const result = await this.db
      .select()
      .from(categoriesTable)
      .where(whereClause)
      .orderBy(asc(categoriesTable.sortOrder), asc(categoriesTable.label))
      .limit(limit)
      .offset(offset);

    return {
      data: result.map((row) => this.toDto(row)),
      total,
    };
  }

  /**
   * Find active categories for dropdowns
   */
  async findActive(tenantId: string): Promise<CategoryResponseDto[]> {
    const result = await this.db
      .select()
      .from(categoriesTable)
      .where(
        and(
          eq(categoriesTable.tenantId, tenantId),
          eq(categoriesTable.isActive, true),
          eq(categoriesTable.isDeleted, false),
        ),
      )
      .orderBy(asc(categoriesTable.sortOrder), asc(categoriesTable.label));

    return result.map((row) => this.toDto(row));
  }

  /**
   * Invalidate cache for a category
   */
  async invalidateCache(id: string): Promise<void> {
    if (this.cacheService) {
      await this.cacheService.delete(`${CACHE_KEY_PREFIX}${id}`);
      this.logger.debug(`Cache invalidated: category ${id}`);
    }
  }

  /**
   * Invalidate cache for multiple categories
   */
  async invalidateCacheMany(ids: string[]): Promise<void> {
    if (this.cacheService && ids.length > 0) {
      const keys = ids.map((id) => `${CACHE_KEY_PREFIX}${id}`);
      await this.cacheService.mdelete(keys);
      this.logger.debug(`Cache invalidated for ${ids.length} categories`);
    }
  }

  /**
   * Map database record to DTO
   */
  private toDto(record: any): CategoryResponseDto {
    return new CategoryResponseDto({
      id: record.id,
      tenantId: record.tenantId,
      value: record.value,
      label: record.label,
      description: record.description,
      color: record.color,
      icon: record.icon,
      isActive: record.isActive,
      parentId: record.parentId,
      sortOrder: record.sortOrder,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      createdBy: record.createdBy,
      updatedBy: record.updatedBy,
    });
  }
}
