import { IAggregateRepository } from '@core/domain';
import { Tenant } from '../entities/tenant.entity';

/**
 * Tenant Repository Interface (Port) - WRITE SIDE ONLY
 *
 * Domain layer defines interface (Port) - Contract for persistence.
 * Infrastructure layer implements (Adapter) - Concrete persistence.
 *
 * ## CQRS Note
 *
 * This interface is for WRITE operations only.
 * Query operations should go through ITenantReadDao (Read Side).
 *
 * Methods returning Domain Entities are allowed here because:
 * - They are used for loading aggregates before modification
 * - They support business rule validation (e.g., uniqueness check)
 *
 * ## Dependency Inversion Principle (DIP)
 *
 * - Domain layer DOES NOT depend on Infrastructure
 * - Application layer injects this interface, not implementation
 * - Import from @core/domain (NOT @core/infrastructure)
 *
 * ## Clean Architecture Flow
 * ```
 * Domain (ITenantRepository) ← Application (Handler) → Infrastructure (TenantRepository)
 * ```
 *
 * ## Inherited Methods from IAggregateRepository
 *
 * The following methods are inherited and don't need to be redefined:
 * - save(aggregate: Tenant): Promise<void>
 * - getById(id: string): Promise<Tenant | null>
 * - delete(id: string): Promise<void>
 */
export interface ITenantRepository extends IAggregateRepository<Tenant> {
  /**
   * Check if subdomain exists (for uniqueness validation)
   *
   * More efficient than loading the full aggregate when you only need existence check.
   *
   * @param subdomain Subdomain to check
   * @returns true if subdomain exists, false otherwise
   */
  existsBySubdomain(subdomain: string): Promise<boolean>;
}
