import { BaseDomainEvent, IEventMetadata } from '@core/domain';

/**
 * Content Updated Event Payload
 *
 * Story 3.2: Update Content
 * Emitted when content fields are updated
 */
export interface ContentUpdatedEventData {
  tenantId: string;
  contentId: string;
  authorId: string;
  changedBy: string;
  changedAt: Date;
  changedFields: string[];
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  previousStatus?: string;
  newStatus?: string;
  title: string;
  content: string;
  excerpt: string | null;
  type: string;
  priority: string;
  categoryId: string | null;
  tags: string[];
}

/**
 * Content Updated Domain Event
 *
 * Story 3.2: Update Content
 *
 * Emitted when:
 * - Content title, content, or excerpt is updated
 * - Content status is reset from REJECTED to DRAFT
 * - Content category, tags, or featured image is updated
 *
 * Used for:
 * - Read model synchronization
 * - Audit logging
 * - Analytics tracking
 */
export class ContentUpdatedEvent extends BaseDomainEvent<ContentUpdatedEventData> {
  constructor(
    aggregateId: string,
    data: ContentUpdatedEventData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'Content', 'ContentUpdated', data, metadata);
  }
}
