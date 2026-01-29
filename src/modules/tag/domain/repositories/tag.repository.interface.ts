import type { IAggregateRepository } from '@core/domain';
import type { Tag } from '../entities/tag.entity';

/**
 * Tag Repository Interface (Port)
 *
 * Story 4.3: Create, Edit, Delete Tags
 *
 * Domain layer interface for Tag aggregate persistence.
 * Infrastructure layer provides the implementation.
 *
 * Follows Hexagonal Architecture:
 * - Domain defines the port (this interface)
 * - Infrastructure provides the adapter (implementation)
 */
export interface ITagRepository extends IAggregateRepository<Tag> {
  /**
   * Find tag by slug (unique key) within tenant
   *
   * @param tenantId Tenant ID
   * @param slug Tag slug (e.g., "emergency")
   * @returns Tag or null if not found
   */
  findBySlug(tenantId: string, slug: string): Promise<Tag | null>;

  /**
   * Check if tag slug exists within tenant
   *
   * @param tenantId Tenant ID
   * @param slug Tag slug
   * @returns True if exists
   */
  existsBySlug(tenantId: string, slug: string): Promise<boolean>;

  /**
   * Find all active tags for a tenant
   *
   * @param tenantId Tenant ID
   * @returns Array of active tags
   */
  findActiveTags(tenantId: string): Promise<Tag[]>;

  /**
   * Count tags for a tenant
   */
  countByTenantId(tenantId: string): Promise<number>;
}
