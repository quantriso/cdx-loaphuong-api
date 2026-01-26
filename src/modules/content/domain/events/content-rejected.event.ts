import { BaseDomainEvent, IEventMetadata } from '@core/domain';

/**
 * Content Rejected Event Data (Type-safe payload)
 *
 * Note: contentId is in aggregateId, not duplicated here (follows DDD pattern)
 */
export interface ContentRejectedEventData {
  tenantId: string;
  authorId: string;
  rejectedBy: string;
  rejectedAt: Date;
  previousStatus: string;
  newStatus: string;
  title: string;
  type: string;
  priority: string;
  categoryId: string | null;
  tags: string[];
  rejectionReason: string;
}

/**
 * Content Rejected Domain Event
 *
 * Published when Admin rejects PENDING content with feedback.
 * Status transition: PENDING → REJECTED
 *
 * Story 3.5: Reject Content with Feedback
 *
 * Event Consumers can use this to:
 * - Update Read Model database
 * - Send notification to author with rejection reason
 * - Log rejection in audit trail
 * - Enable author to view feedback and make improvements
 */
export class ContentRejectedEvent extends BaseDomainEvent<ContentRejectedEventData> {
  constructor(
    aggregateId: string,
    data: ContentRejectedEventData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'Content', 'ContentRejected', data, metadata);
  }
}
