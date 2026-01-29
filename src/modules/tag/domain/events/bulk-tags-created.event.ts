import { BaseDomainEvent, IEventMetadata } from 'src/libs/core/domain';

/**
 * Bulk Tags Created Event Data
 *
 * Story 4.4: Bulk Create Tags - Audit Logging
 */
export interface BulkTagsCreatedData {
  tenantId: string;
  userId: string;
  created: number;
  skipped: number;
  failed: number;
  timestamp: Date;
  tagIds?: string[]; // IDs of successfully created tags
}

/**
 * Bulk Tags Created Event
 *
 * Story 4.4: Bulk Create Tags - Audit Logging
 *
 * Emitted when bulk tag creation operation completes.
 * Used for audit logging and tracking bulk operations.
 */
export class BulkTagsCreatedEvent extends BaseDomainEvent<BulkTagsCreatedData> {
  constructor(
    aggregateId: string, // Can be first tag ID or a unique batch ID
    data: BulkTagsCreatedData,
    metadata?: IEventMetadata,
  ) {
    super(
      aggregateId,
      'Tag',
      'BulkTagsCreated',
      data,
      metadata,
    );
  }
}
