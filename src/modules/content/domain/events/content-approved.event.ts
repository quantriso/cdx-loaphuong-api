import { BaseDomainEvent, IEventMetadata } from '@core/domain';

/**
 * Content Approved Event Data (Type-safe payload)
 *
 * Note: contentId is in aggregateId, not duplicated here (follows DDD pattern)
 */
export interface ContentApprovedEventData {
  tenantId: string;
  authorId: string;
  approvedBy: string;
  approvedAt: Date;
  previousStatus: string;
  newStatus: string;
  title: string;
  type: string;
  priority: string;
  categoryId: string | null;
  tags: string[];
  approvalReason?: string;
}

/**
 * Content Approved Domain Event
 *
 * Published when Admin approves PENDING content.
 * Status transition: PENDING → APPROVED
 *
 * Story 3.4: Approve Content
 *
 * Event Consumers can use this to:
 * - Update Read Model database
 * - Send notification to author
 * - Log approval in audit trail
 * - Trigger downstream workflows
 */
export class ContentApprovedEvent extends BaseDomainEvent<ContentApprovedEventData> {
  constructor(
    aggregateId: string,
    data: ContentApprovedEventData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'Content', 'ContentApproved', data, metadata);
  }
}
