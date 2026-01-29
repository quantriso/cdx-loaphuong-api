import type { TagResponseDto } from '../../dtos/tag-response.dto';

/**
 * Tag Read DAO Interface (Port)
 *
 * Story 4.3: Create, Edit, Delete Tags
 *
 * Read-only data access for tag queries.
 * Defined in Application layer, implemented in Infrastructure layer.
 *
 * Follows CQRS:
 * - Separate read model from write model
 * - Optimized for query performance
 * - May use denormalized data
 */
export interface ITagReadDao {
  /**
   * Find tag by ID
   *
   * @param id Tag ID
   * @param tenantId Tenant ID
   * @returns Tag DTO or null
   */
  findById(id: string, tenantId: string): Promise<TagResponseDto | null>;

  /**
   * Find all tags with optional filters
   *
   * @param tenantId Tenant ID
   * @param isActive Filter by active status
   * @param page Page number (1-indexed)
   * @param limit Items per page
   * @returns Paginated tags
   */
  findAll(
    tenantId: string,
    isActive?: boolean,
    page?: number,
    limit?: number,
  ): Promise<{ data: TagResponseDto[]; total: number }>;

  /**
   * Find active tags
   *
   * @param tenantId Tenant ID
   * @returns Array of active tags
   */
  findActive(tenantId: string): Promise<TagResponseDto[]>;

  /**
   * Invalidate cache for tag
   *
   * @param id Tag ID
   */
  invalidateCache(id: string): Promise<void>;

  /**
   * Invalidate cache for multiple tags
   *
   * @param ids Tag IDs
   */
  invalidateCacheMany(ids: string[]): Promise<void>;
}
