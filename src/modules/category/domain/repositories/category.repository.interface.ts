import type { IAggregateRepository } from '@core/domain';
import type { Category } from '../entities/category.entity';

/**
 * Category Repository Interface (Port)
 *
 * Story 4.1: Manage Categories
 *
 * Domain layer interface for Category aggregate persistence.
 * Infrastructure layer provides the implementation.
 *
 * Follows Hexagonal Architecture:
 * - Domain defines the port (this interface)
 * - Infrastructure provides the adapter (implementation)
 */
export interface ICategoryRepository extends IAggregateRepository<Category> {
  /**
   * Find category by value (unique key) within tenant
   *
   * @param tenantId Tenant ID
   * @param value Category value (e.g., "EMERGENCY")
   * @returns Category or null if not found
   */
  findByValue(tenantId: string, value: string): Promise<Category | null>;

  /**
   * Find child categories by parent ID
   *
   * @param parentId Parent category ID (null for root categories)
   * @param tenantId Tenant ID
   * @returns Array of child categories
   */
  findByParentId(
    parentId: string | null,
    tenantId: string,
  ): Promise<Category[]>;

  /**
   * Check if category value exists within tenant
   *
   * @param tenantId Tenant ID
   * @param value Category value
   * @returns True if exists
   */
  existsByValue(tenantId: string, value: string): Promise<boolean>;

  /**
   * Count categories for a tenant
   */
  countByTenantId(tenantId: string): Promise<number>;

  /**
   * Count child categories
   */
  countChildren(parentId: string, tenantId: string): Promise<number>;
}
