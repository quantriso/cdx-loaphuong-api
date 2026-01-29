import { BaseDomainEvent, type IEventMetadata } from '@core/domain';
import { TagCategory } from '../entities/tag.entity';

/**
 * Tag Created Event Data
 *
 * Story 4.3: Create, Edit, Delete Tags
 */
export interface TagCreatedEventData {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  category: TagCategory;
  synonyms: string[];
  isActive: boolean;
  usageCount: number;
  metadata: Record<string, unknown> | null;
  createdBy: string;
}

/**
 * Tag Created Domain Event
 *
 * Story 4.3: Create, Edit, Delete Tags
 *
 * Published when a new tag is created.
 *
 * Event Consumers can use this to:
 * - Update Read Model database
 * - Log creation in audit trail
 * - Invalidate tag cache
 * - Notify administrators
 */
export class TagCreatedEvent extends BaseDomainEvent<TagCreatedEventData> {
  constructor(
    aggregateId: string,
    data: TagCreatedEventData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'Tag', 'TagCreated', data, metadata);
  }
}
