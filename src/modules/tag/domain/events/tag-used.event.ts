import { BaseDomainEvent, type IEventMetadata } from '@core/domain';

/**
 * Tag Used Event Data
 *
 * Story 4.3: Tag Usage Tracking
 */
export interface TagUsedEventData {
  id: string;
  tenantId: string;
  contentId: string;
  usageCount: number;
}

/**
 * Tag Used Domain Event
 *
 * Story 4.3: Tag Usage Tracking
 *
 * Published when a tag is used in content.
 *
 * Event Consumers can use this to:
 * - Update tag usage statistics
 * - Track popular tags for analytics
 * - Update search index weights
 * - Generate tag usage reports
 */
export class TagUsedEvent extends BaseDomainEvent<TagUsedEventData> {
  constructor(
    aggregateId: string,
    data: TagUsedEventData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'Tag', 'TagUsed', data, metadata);
  }
}
