import { BaseDomainEvent, IEventMetadata } from '@core/domain';

/**
 * Content Published Event Data (Type-safe payload)
 *
 * Note: contentId is in aggregateId, not duplicated here (follows DDD pattern)
 */
export interface ContentPublishedEventData {
  tenantId: string;
  authorId: string;
  publishedBy: string;
  publishedAt: Date;
  previousStatus: string;
  newStatus: string;
  title: string;
  type: string;
  priority: string;
  categoryId: string | null;
  tags: string[];
}

/**
 * Content Published Domain Event
 *
 * Published when Admin publishes APPROVED content.
 * Status transition: APPROVED → PUBLISHED
 *
 * Story 3.6: Publish Content
 *
 * Event Consumers can use this to:
 * - Update Read Model database
 * - Send notification to author about publication
 * - Log publication in audit trail
 * - Update published content cache
 * - Trigger SEO indexing
 */
export class ContentPublishedEvent extends BaseDomainEvent<ContentPublishedEventData> {
  constructor(
    aggregateId: string,
    data: ContentPublishedEventData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'Content', 'ContentPublished', data, metadata);
  }
}
