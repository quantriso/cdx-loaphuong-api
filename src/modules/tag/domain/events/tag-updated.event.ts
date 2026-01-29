import { BaseDomainEvent, type IEventMetadata } from '@core/domain';
import { TagCategory } from '../entities/tag.entity';

/**
 * Tag Updated Event Data
 *
 * Story 4.3: Create, Edit, Delete Tags
 */
export interface TagUpdatedEventData {
  id: string;
  tenantId: string;
  name: string | null;
  description: string | null;
  color: string | null;
  category: TagCategory | null;
  synonyms: string[] | null;
  isActive: boolean | null;
  metadata: Record<string, unknown> | null;
  updatedBy: string;
}

/**
 * Tag Updated Domain Event
 *
 * Story 4.3: Create, Edit, Delete Tags
 *
 * Published when a tag is updated.
 * Only changed fields are included (others are null).
 *
 * Event Consumers can use this to:
 * - Update Read Model database
 * - Log changes in audit trail
 * - Invalidate tag cache
 * - Update content tag references
 */
export class TagUpdatedEvent extends BaseDomainEvent<TagUpdatedEventData> {
  constructor(
    aggregateId: string,
    data: TagUpdatedEventData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'Tag', 'TagUpdated', data, metadata);
  }
}
