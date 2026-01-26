import { BaseDomainEvent, IEventMetadata } from '@core/domain';

/**
 * Content Archived Event Data (Type-safe payload)
 *
 * Note: contentId is in aggregateId, not duplicated here (follows DDD pattern)
 */
export interface ContentArchivedEventData {
  tenantId: string;
  authorId: string;
  archivedBy: string;
  archivedAt: Date;
  previousStatus: string;
  newStatus: string;
  title: string;
  type: string;
  priority: string;
  categoryId: string | null;
  tags: string[];
}

/**
 * Content Archived Domain Event
 *
 * Published when Admin archives PUBLISHED content.
 * Status transition: PUBLISHED → ARCHIVED
 *
 * Story 3.7: Archive Content
 *
 * Event Consumers can use this to:
 * - Update Read Model database
 * - Remove from active published lists
 * - Update archived content cache
 * - Log archival in audit trail
 * - Update content statistics
 */
export class ContentArchivedEvent extends BaseDomainEvent<ContentArchivedEventData> {
  constructor(
    aggregateId: string,
    data: ContentArchivedEventData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'Content', 'ContentArchived', data, metadata);
  }
}
