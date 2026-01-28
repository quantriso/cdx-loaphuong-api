import type { CategoryResponseDto } from '../../dtos/category-response.dto';

/**
 * Category Read DAO Interface (Port)
 *
 * Story 4.1: Manage Categories
 *
 * Read-only data access for category queries.
 * Defined in Application layer, implemented in Infrastructure layer.
 *
 * Follows CQRS:
 * - Separate read model from write model
 * - Optimized for query performance
 * - May use denormalized data
 */
export interface ICategoryReadDao {
  /**
   * Find category by ID
   *
   * @param id Category ID
   * @param tenantId Tenant ID
   * @returns Category DTO or null
   */
  findById(id: string, tenantId: string): Promise<CategoryResponseDto | null>;

  /**
   * Find all categories with optional filters
   *
   * @param tenantId Tenant ID
   * @param isActive Filter by active status
   * @param parentId Filter by parent ID
   * @param page Page number (1-indexed)
   * @param limit Items per page
   * @returns Paginated categories
   */
  findAll(
    tenantId: string,
    isActive?: boolean,
    parentId?: string | null,
    page?: number,
    limit?: number,
  ): Promise<{ data: CategoryResponseDto[]; total: number }>;

  /**
   * Find active categories
   *
   * @param tenantId Tenant ID
   * @returns Array of active categories
   */
  findActive(tenantId: string): Promise<CategoryResponseDto[]>;

  /**
   * Invalidate cache for category
   *
   * @param id Category ID
   */
  invalidateCache(id: string): Promise<void>;

  /**
   * Invalidate cache for multiple categories
   *
   * @param ids Category IDs
   */
  invalidateCacheMany(ids: string[]): Promise<void>;
}
