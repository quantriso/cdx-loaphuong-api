import { BaseDomainEvent, IEventMetadata } from '@core/domain';

/**
 * Individual content archive item in a bulk operation
 */
export interface BulkContentArchiveItem {
  contentId: string;
  previousStatus: string;
  newStatus: string;
  reason?: string;
}

/**
 * Bulk Content Archived Event Data
 *
 * Story 3.8: Bulk Archive Content
 */
export interface BulkContentArchivedEventData {
  tenantId: string;
  items: BulkContentArchiveItem[];
  totalRequested: number;
  successful: number;
  failed: number;
  batchReference?: string;
  archivedBy: string;
  archivedAt: Date;
}

/**
 * Bulk Content Archived Domain Event
 *
 * Published when a bulk content archive operation completes.
 * Contains summary of all archive operations made in the batch.
 *
 * Story 3.8: Bulk Archive Content
 *
 * Event Consumers can:
 * - Audit logging with full operation details
 * - Analytics and reporting
 * - Notifications to users/teams
 * - Integration with external CMS systems
 *
 * Note: aggregateId is the batch reference or first content ID
 */
export class BulkContentArchivedEvent extends BaseDomainEvent<BulkContentArchivedEventData> {
  constructor(
    aggregateId: string, // Batch ID or first content ID
    data: BulkContentArchivedEventData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'Content', 'BulkContentArchived', data, metadata);
  }
}
