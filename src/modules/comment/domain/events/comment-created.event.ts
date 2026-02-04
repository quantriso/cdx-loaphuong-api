import { BaseDomainEvent, IEventMetadata } from '@core/domain';

interface CommentCreatedData {
  contentId: string;
  userId: string;
  content: string;
  tenantId: string;
  mentions?: string[];
}

export class CommentCreatedEvent extends BaseDomainEvent<CommentCreatedData> {
  constructor(
    aggregateId: string,
    data: CommentCreatedData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'Comment', 'CommentCreated', data, metadata);
  }
}
