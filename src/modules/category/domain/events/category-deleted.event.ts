import { BaseDomainEvent, type IEventMetadata } from '@core/domain';

/**
 * Category Deleted Event Data
 *
 * Story 4.1: Manage Categories
 */
export interface CategoryDeletedEventData {
  tenantId: string;
  value: string;
}

/**
 * Category Deleted Domain Event
 *
 * Story 4.1: Manage Categories
 *
 * Published when a category is deleted.
 *
 * Event Consumers can use this to:
 * - Update Read Model database
 * - Log deletion in audit trail
 * - Remove from cache
 * - Check for orphaned content
 */
export class CategoryDeletedEvent extends BaseDomainEvent<CategoryDeletedEventData> {
  constructor(
    aggregateId: string,
    data: CategoryDeletedEventData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'Category', 'CategoryDeleted', data, metadata);
  }
}
