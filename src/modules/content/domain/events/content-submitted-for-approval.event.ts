import { BaseDomainEvent, IEventMetadata } from '@core/domain';

/**
 * Content Submitted for Approval Event Payload
 *
 * Story 3.3: Submit Content for Approval
 */
export interface ContentSubmittedForApprovalPayload {
  tenantId: string;
  contentId: string;
  authorId: string;
  title: string;
  content: string;
  previousStatus: string;
  newStatus: string;
  type: string;
  priority: string;
  categoryId: string | null;
  tags: string[];
  submittedAt: Date;
}

/**
 * Content Submitted for Approval Domain Event
 *
 * Story 3.3: Submit Content for Approval
 *
 * Emitted when:
 * - Author submits DRAFT content for approval
 * - Status transitions from DRAFT to PENDING
 *
 * Used for:
 * - Read model synchronization
 * - Notification to reviewers/approvers
 * - Audit logging
 * - Analytics tracking
 */
export class ContentSubmittedForApprovalEvent extends BaseDomainEvent<ContentSubmittedForApprovalPayload> {
  constructor(
    aggregateId: string,
    data: ContentSubmittedForApprovalPayload,
    metadata?: IEventMetadata,
  ) {
    super(
      aggregateId,
      'Content',
      'ContentSubmittedForApproval',
      data,
      metadata,
    );
  }
}
