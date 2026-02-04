import { BaseDomainEvent, IEventMetadata } from '@core/domain';

interface MentionedUserNotificationData {
  commentId: string;
  contentId: string;
  mentionedUserId: string;
  mentionedByUserId: string;
  commentContent: string;
  tenantId: string;
}

export class MentionedUserNotificationEvent extends BaseDomainEvent<MentionedUserNotificationData> {
  constructor(
    aggregateId: string,
    data: MentionedUserNotificationData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'Comment', 'MentionedUserNotification', data, metadata);
  }
}
