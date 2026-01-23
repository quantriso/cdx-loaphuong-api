import { BaseDomainEvent, IEventMetadata } from "@core/domain";

/**
 * Content Created Event Data
 */
export interface ContentCreatedEventData {
  id: string;
  tenantId: string;
  authorId: string;
  title: string;
  type: string;
  status: string;
}

/**
 * Content Created Domain Event
 *
 * Published when new content is created in DRAFT status.
 */
export class ContentCreatedEvent extends BaseDomainEvent<ContentCreatedEventData> {
  constructor(
    aggregateId: string,
    data: ContentCreatedEventData,
    metadata?: IEventMetadata
  ) {
    super(aggregateId, "Content", "ContentCreated", data, metadata);
  }
}
