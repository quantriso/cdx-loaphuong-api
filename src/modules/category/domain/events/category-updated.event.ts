import { BaseDomainEvent, type IEventMetadata } from '@core/domain';

/**
 * Category Updated Event Data
 *
 * Story 4.1: Manage Categories
 */
export interface CategoryUpdatedEventData {
  tenantId: string;
  label: string | null;
  description: string | null;
  color: string | null;
  icon: string | null;
  isActive: boolean | null;
  sortOrder: number | null;
  parentId: string | null;
  updatedBy: string;
}

/**
 * Category Updated Domain Event
 *
 * Story 4.1: Manage Categories
 *
 * Published when a category is updated.
 * Only changed fields are included (others are null).
 *
 * Event Consumers can use this to:
 * - Update Read Model database
 * - Log changes in audit trail
 * - Invalidate category cache
 * - Update content category references
 */
export class CategoryUpdatedEvent extends BaseDomainEvent<CategoryUpdatedEventData> {
  constructor(
    aggregateId: string,
    data: CategoryUpdatedEventData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'Category', 'CategoryUpdated', data, metadata);
  }
}
