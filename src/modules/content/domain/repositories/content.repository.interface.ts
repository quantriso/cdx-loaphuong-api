import { IAggregateRepository } from "@core/domain";
import { Content } from "../entities";

/**
 * Content Repository Interface (Port) - WRITE SIDE ONLY
 *
 * Domain layer defines interface (Port) - Contract for persistence.
 * Infrastructure layer implements (Adapter) - Concrete persistence.
 *
 * ## CQRS Note
 *
 * This interface is for WRITE operations only.
 * Query operations should go through IContentReadDao (Read Side).
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
 * ## Inherited Methods from IAggregateRepository
 *
 * The following methods are inherited and don't need to be redefined:
 * - save(aggregate: Content): Promise<Content>
 * - getById(id: string): Promise<Content | null>
 * - delete(id: string): Promise<void>
 */
export interface IContentRepository extends IAggregateRepository<Content> {
  /**
   * Check if content exists by ID and tenant
   * More efficient than loading full aggregate
   */
  existsById(id: string, tenantId: string): Promise<boolean>;
}
