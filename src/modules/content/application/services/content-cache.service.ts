import { Injectable, Inject, Logger } from '@nestjs/common';
import type { ICacheService } from '@shared/caching';
import { CACHE_SERVICE_TOKEN } from '@core/constants';
import { ContentResponseDto } from '../dtos';
import { ContentStatus } from '../../domain/value-objects';

/**
 * Content Cache Service
 *
 * Story 3.7: Edit Draft Content
 *
 * Cache Management:
 * - Cache content details by tenant and ID
 * - Cache content lists by tenant
 * - Invalidate cache on content updates
 * - Support TTL-based expiration
 *
 * Cache Key Patterns:
 * - Content Details: `content:{tenantId}:{contentId}`
 * - Content Lists: `content:list:{tenantId}:{hash(query)}`
 * - Content Status Lists: `content:list:{tenantId}:status:{status}`
 */
@Injectable()
export class ContentCacheService {
  private readonly _logger = new Logger(ContentCacheService.name);
  private readonly _CACHE_PREFIX = 'content';
  private readonly _CACHE_TTL_DETAILS = 3600; // 1 hour
  private readonly _CACHE_TTL_LISTS = 300; // 5 minutes

  constructor(
    @Inject(CACHE_SERVICE_TOKEN)
    private readonly _cacheService: ICacheService,
  ) {}

  /**
   * Get cached content details
   *
   * @param tenantId Tenant ID
   * @param contentId Content ID
   * @returns Cached content or null
   */
  async getContentDetails(
    tenantId: string,
    contentId: string,
  ): Promise<ContentResponseDto | null> {
    const cacheKey = this.buildContentDetailsKey(tenantId, contentId);

    try {
      const cached = await this._cacheService.get<ContentResponseDto>(cacheKey);
      if (cached) {
        this._logger.debug(`Cache HIT: ${cacheKey}`);
        return cached;
      }
      this._logger.debug(`Cache MISS: ${cacheKey}`);
      return null;
    } catch (error) {
      this._logger.error(`Failed to get cached content: ${cacheKey}`, error);
      return null; // Fail silently, fallback to DB
    }
  }

  /**
   * Set content details cache
   *
   * @param tenantId Tenant ID
   * @param contentId Content ID
   * @param content Content to cache
   */
  async setContentDetails(
    tenantId: string,
    contentId: string,
    content: ContentResponseDto,
  ): Promise<void> {
    const cacheKey = this.buildContentDetailsKey(tenantId, contentId);

    try {
      await this._cacheService.set(cacheKey, content, this._CACHE_TTL_DETAILS);
      this._logger.debug(
        `Cache SET: ${cacheKey} (TTL: ${this._CACHE_TTL_DETAILS}s)`,
      );
    } catch (error) {
      this._logger.error(`Failed to cache content: ${cacheKey}`, error);
      // Fail silently, don't block operation
    }
  }

  /**
   * Invalidate content details cache
   *
   * @param tenantId Tenant ID
   * @param contentId Content ID
   */
  async invalidateContentDetails(
    tenantId: string,
    contentId: string,
  ): Promise<void> {
    const cacheKey = this.buildContentDetailsKey(tenantId, contentId);

    try {
      await this._cacheService.delete(cacheKey);
      this._logger.debug(`Cache INVALIDATE: ${cacheKey}`);
    } catch (error) {
      this._logger.error(`Failed to invalidate cache: ${cacheKey}`, error);
      // Fail silently
    }
  }

  /**
   * Get cached content list
   *
   * @param tenantId Tenant ID
   * @param queryHash Hash of query parameters
   * @returns Cached content list or null
   */
  async getContentList(
    tenantId: string,
    queryHash: string,
  ): Promise<ContentResponseDto[] | null> {
    const cacheKey = this.buildContentListKey(tenantId, queryHash);

    try {
      const cached =
        await this._cacheService.get<ContentResponseDto[]>(cacheKey);
      if (cached) {
        this._logger.debug(`Cache HIT: ${cacheKey}`);
        return cached;
      }
      this._logger.debug(`Cache MISS: ${cacheKey}`);
      return null;
    } catch (error) {
      this._logger.error(
        `Failed to get cached content list: ${cacheKey}`,
        error,
      );
      return null;
    }
  }

  /**
   * Set content list cache
   *
   * @param tenantId Tenant ID
   * @param queryHash Hash of query parameters
   * @param contentList Content list to cache
   */
  async setContentList(
    tenantId: string,
    queryHash: string,
    contentList: ContentResponseDto[],
  ): Promise<void> {
    const cacheKey = this.buildContentListKey(tenantId, queryHash);

    try {
      await this._cacheService.set(
        cacheKey,
        contentList,
        this._CACHE_TTL_LISTS,
      );
      this._logger.debug(
        `Cache SET: ${cacheKey} (TTL: ${this._CACHE_TTL_LISTS}s)`,
      );
    } catch (error) {
      this._logger.error(`Failed to cache content list: ${cacheKey}`, error);
    }
  }

  /**
   * Invalidate content list cache for tenant
   *
   * @param tenantId Tenant ID
   * @param status Optional status to invalidate specific status lists
   */
  async invalidateContentList(
    tenantId: string,
    status?: ContentStatus,
  ): Promise<void> {
    try {
      // Invalidate all content list keys for this tenant
      // Note: This is a simple implementation. For production, consider using
      // Redis SCAN or pattern-based deletion for better performance
      const pattern = this.buildContentListPattern(tenantId, status);
      this._logger.debug(`Cache INVALIDATE pattern: ${pattern}`);

      // Since ICacheService doesn't support pattern deletion,
      // we'll implement a best-effort approach
      // In production with Redis, you would use KEYS/SCAN + DEL
      // For now, we'll just log the invalidation
      this._logger.warn(
        `Pattern-based cache invalidation not fully implemented. Pattern: ${pattern}`,
      );
    } catch (error) {
      this._logger.error(`Failed to invalidate content list cache`, error);
    }
  }

  /**
   * Invalidate all caches for a content item
   *
   * @param tenantId Tenant ID
   * @param contentId Content ID
   * @param status Current content status (for list invalidation)
   */
  async invalidateAllCaches(
    tenantId: string,
    contentId: string,
    status?: ContentStatus,
  ): Promise<void> {
    try {
      // Invalidate content details
      await this.invalidateContentDetails(tenantId, contentId);

      // Invalidate content lists (including status-specific)
      await this.invalidateContentList(tenantId, status);

      this._logger.debug(
        `Invalidated all caches for content ${contentId} in tenant ${tenantId}`,
      );
    } catch (error) {
      this._logger.error(`Failed to invalidate all caches`, error);
    }
  }

  /**
   * Clear all content cache for a tenant
   *
   * @param tenantId Tenant ID
   */
  async clearTenantCache(tenantId: string): Promise<void> {
    try {
      const pattern = `${this._CACHE_PREFIX}:${tenantId}:*`;
      this._logger.debug(`Clearing all cache with pattern: ${pattern}`);

      // Note: Pattern-based clearing not fully implemented
      // In production with Redis, use SCAN + DEL
      this._logger.warn(
        `Tenant-wide cache clearing not fully implemented. Pattern: ${pattern}`,
      );
    } catch (error) {
      this._logger.error(`Failed to clear tenant cache`, error);
    }
  }

  /**
   * Warm cache with content data
   *
   * @param tenantId Tenant ID
   * @param contents Content list to warm cache with
   */
  async warmCache(
    tenantId: string,
    contents: ContentResponseDto[],
  ): Promise<void> {
    try {
      this._logger.debug(`Warming cache for ${contents.length} items`);

      const promises = contents.map((content) =>
        this.setContentDetails(tenantId, content.id, content),
      );

      await Promise.all(promises);
      this._logger.debug(`Cache warming complete for ${contents.length} items`);
    } catch (error) {
      this._logger.error(`Failed to warm cache`, error);
    }
  }

  // --- Private Helper Methods ---

  private buildContentDetailsKey(tenantId: string, contentId: string): string {
    return `${this._CACHE_PREFIX}:${tenantId}:${contentId}`;
  }

  private buildContentListKey(tenantId: string, queryHash: string): string {
    return `${this._CACHE_PREFIX}:list:${tenantId}:${queryHash}`;
  }

  private buildContentListPattern(
    tenantId: string,
    status?: ContentStatus,
  ): string {
    if (status) {
      return `${this._CACHE_PREFIX}:list:${tenantId}:status:${status.toString()}:*`;
    }
    return `${this._CACHE_PREFIX}:list:${tenantId}:*`;
  }
}
