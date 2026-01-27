import { BaseDomainEvent, IEventMetadata } from '@core/domain';

/**
 * Individual content publish item in a bulk operation
 */
export interface BulkContentPublishItem {
  contentId: string;
  previousStatus: string;
  newStatus: string;
  reason?: string;
}

/**
 * Bulk Content Published Event Data
 *
 * Story 3.8: Bulk Publish Content
 */
export interface BulkContentPublishedEventData {
  tenantId: string;
  items: BulkContentPublishItem[];
  totalRequested: number;
  successful: number;
  failed: number;
  batchReference?: string;
  publishedBy: string;
  publishedAt: Date;
}

/**
 * Bulk Content Published Domain Event
 *
 * Published when a bulk content publish operation completes.
 * Contains summary of all publish operations made in the batch.
 *
 * Story 3.8: Bulk Publish Content
 *
 * Event Consumers can:
 * - Audit logging with full operation details
 * - Analytics and reporting
 * - Notifications to users/teams
 * - Integration with external CMS systems
 *
 * Note: aggregateId is the batch reference or first content ID
 */
export class BulkContentPublishedEvent extends BaseDomainEvent<BulkContentPublishedEventData> {
  constructor(
    aggregateId: string, // Batch ID or first content ID
    data: BulkContentPublishedEventData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'Content', 'BulkContentPublished', data, metadata);
  }
}
