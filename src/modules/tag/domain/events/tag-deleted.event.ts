import { BaseDomainEvent, type IEventMetadata } from '@core/domain';

/**
 * Tag Deleted Event Data
 *
 * Story 4.3: Create, Edit, Delete Tags
 */
export interface TagDeletedEventData {
  id: string;
  tenantId: string;
  slug: string;
  usageCount: number;
  deletedBy: string;
}

/**
 * Tag Deleted Domain Event
 *
 * Story 4.3: Create, Edit, Delete Tags
 *
 * Published when a tag is deleted.
 *
 * Event Consumers can use this to:
 * - Update Read Model database
 * - Log deletion in audit trail
 * - Remove from cache
 * - Check for orphaned content
 */
export class TagDeletedEvent extends BaseDomainEvent<TagDeletedEventData> {
  constructor(
    aggregateId: string,
    data: TagDeletedEventData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'Tag', 'TagDeleted', data, metadata);
  }
}
