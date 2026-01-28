import { BaseDomainEvent, type IEventMetadata } from '@core/domain';

/**
 * Category Created Event Data
 *
 * Story 4.1: Manage Categories
 */
export interface CategoryCreatedEventData {
  tenantId: string;
  value: string;
  label: string;
  description: string;
  color: string;
  icon: string;
  isActive: boolean;
  sortOrder: number;
  parentId: string;
}

/**
 * Category Created Domain Event
 *
 * Story 4.1: Manage Categories
 *
 * Published when a new category is created.
 *
 * Event Consumers can use this to:
 * - Update Read Model database
 * - Log creation in audit trail
 * - Invalidate category cache
 * - Notify administrators
 */
export class CategoryCreatedEvent extends BaseDomainEvent<CategoryCreatedEventData> {
  constructor(
    aggregateId: string,
    data: CategoryCreatedEventData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'Category', 'CategoryCreated', data, metadata);
  }
}
