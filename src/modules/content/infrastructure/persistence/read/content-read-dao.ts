import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import { eq, and, desc, asc, gte, lte, inArray, sql, count } from 'drizzle-orm';

// Import from Core (interfaces)
import type { ICacheService } from 'src/libs/core/infrastructure';
import { CACHE_SERVICE_TOKEN } from 'src/libs/core/constants';

// Import from Shared (implementations)
import {
  BaseReadDao,
  DATABASE_READ_TOKEN,
  type DrizzleDB,
  schema,
} from 'src/libs/shared';
import { PaginatedResponseDto } from 'src/libs/shared/http/dtos/pagination.dto';

// Import Application DTOs & Ports
import { ContentResponseDto } from '../../../application/dtos';
import { IContentReadDao } from '../../../application/queries/ports';

// Import Infrastructure
import { contentsTable } from '../drizzle/schema';
import { contentTagsTable } from '../drizzle/schema/content-tags.schema';
import { tagsTable } from '../../../../tag/infrastructure/persistence/drizzle/schema/tag.schema';

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

    const content = await this.toDto(result[0]);

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

    return Promise.all(result.map((content) => this.toDto(content)));
  }

  /**
   * List contents with filtering, sorting, and pagination
   *
   * Story 4.5: Filter Content by Category & Tags
   *
   * Implements:
   * - Category filtering
   * - Tag filtering with AND logic (content must have ALL specified tags)
   * - Date range filtering
   * - Type, author, status filtering
   * - Sorting by multiple fields
   * - Pagination
   */
  async listContents(
    tenantId: string,
    filters: {
      page: number;
      limit: number;
      category?: string;
      tags?: string[];
      dateFrom?: string;
      dateTo?: string;
      type?: string;
      authorId?: string;
      status?: string[];
      sortBy: string;
      sortOrder: string;
    },
  ): Promise<PaginatedResponseDto<ContentResponseDto>> {
    const {
      page,
      limit,
      category,
      tags,
      dateFrom,
      dateTo,
      type,
      authorId,
      status,
      sortBy,
      sortOrder,
    } = filters;

    // Build WHERE conditions
    const conditions: any[] = [eq(contentsTable.tenantId, tenantId)];

    // Category filter
    if (category) {
      conditions.push(eq(contentsTable.categoryId, category));
    }

    // Date range filters (using createdAt for now)
    if (dateFrom) {
      conditions.push(gte(contentsTable.createdAt, new Date(dateFrom)));
    }
    if (dateTo) {
      conditions.push(lte(contentsTable.createdAt, new Date(dateTo)));
    }

    // Type filter
    if (type) {
      conditions.push(eq(contentsTable.type, type));
    }

    // Author filter
    if (authorId) {
      conditions.push(eq(contentsTable.authorId, authorId));
    }

    // Status filter (array)
    if (status && status.length > 0) {
      conditions.push(inArray(contentsTable.status, status as any[]));
    }

    // Calculate offset
    const offset = (page - 1) * limit;

    // Build sort order
    const sortColumn =
      sortBy === 'createdAt'
        ? contentsTable.createdAt
        : sortBy === 'updatedAt'
          ? contentsTable.updatedAt
          : contentsTable.createdAt;

    const orderFn = sortOrder === 'asc' ? asc : desc;

    // Tag filtering (AND logic) - if tags are specified
    if (tags && tags.length > 0) {
      // Query with tag joins
      const contentIdsWithTags = await this.db
        .select({
          contentId: contentTagsTable.contentId,
        })
        .from(contentTagsTable)
        .innerJoin(tagsTable, eq(contentTagsTable.tagId, tagsTable.id))
        .where(
          and(
            eq(tagsTable.tenantId, tenantId),
            inArray(tagsTable.slug, tags),
            eq(tagsTable.isDeleted, false),
          ),
        )
        .groupBy(contentTagsTable.contentId)
        .having(sql`COUNT(DISTINCT ${tagsTable.id}) = ${tags.length}`);

      const contentIds = contentIdsWithTags.map((r) => r.contentId);

      if (contentIds.length === 0) {
        // No content matches the tag criteria
        return new PaginatedResponseDto([], 0, page, limit);
      }

      // Add content ID filter
      conditions.push(inArray(contentsTable.id, contentIds));
    }

    // Execute count query
    const countResult = await this.db
      .select({ count: count() })
      .from(contentsTable)
      .where(and(...conditions));

    const total = Number(countResult[0]?.count || 0);

    // Execute data query with pagination and sorting
    const result = await this.db
      .select()
      .from(contentsTable)
      .where(and(...conditions))
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset(offset);

    // Map records to DTOs (tags will be fetched from junction table)
    const contentDtos = await Promise.all(
      result.map((content) => this.toDto(content)),
    );

    return new PaginatedResponseDto(contentDtos, total, page, limit);
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
   * Fetch tag slugs for a content from junction table
   *
   * Story 4.5: Migrated from JSONB to junction table
   */
  private async fetchContentTags(contentId: string): Promise<string[]> {
    const tagRecords = await this.db
      .select({ slug: tagsTable.slug })
      .from(contentTagsTable)
      .innerJoin(tagsTable, eq(contentTagsTable.tagId, tagsTable.id))
      .where(
        and(
          eq(contentTagsTable.contentId, contentId),
          eq(tagsTable.isDeleted, false),
        ),
      );

    return tagRecords.map((t) => t.slug);
  }

  /**
   * Map database record to DTO
   *
   * Story 4.5: Updated to fetch tags from junction table
   */
  private async toDto(record: any): Promise<ContentResponseDto> {
    // Fetch tags from junction table
    const tags = await this.fetchContentTags(record.id);

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
      tags,
      featuredImage: record.featuredImage,
      version: record.version,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
