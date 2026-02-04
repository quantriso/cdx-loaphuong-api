import { Comment } from '../entities/comment.entity';

/**
 * Reply Notification Event
 *
 * Story 6.2: Reply to comment
 *
 * Domain event published when a user replies to another user's comment.
 * This event is used to notify the parent comment's author that someone
 * has replied to their comment.
 *
 * The event is published through the outbox pattern to ensure reliable
 * event delivery and eventual consistency.
 */
export class ReplyNotificationEvent {
  static readonly EVENT_NAME = 'comment.reply.notification';

  constructor(
    public readonly replyComment: Comment,
    public readonly parentCommentAuthorId: string,
    public readonly rootCommentId?: string,
  ) {}

  /**
   * Gets the event name
   */
  get eventName(): string {
    return ReplyNotificationEvent.EVENT_NAME;
  }

  /**
   * Gets the event data
   */
  getData(): {
    replyId: string;
    replyAuthorId: string;
    replyContent: string;
    contentId: string;
    parentCommentId: string;
    parentCommentAuthorId: string;
    rootCommentId?: string;
    tenantId: string;
    createdAt: Date;
  } {
    return {
      replyId: this.replyComment.commentId,
      replyAuthorId: this.replyComment.authorId,
      replyContent: this.replyComment.content.value,
      contentId: this.replyComment.contentId,
      parentCommentId: this.replyComment.parentCommentId!,
      parentCommentAuthorId: this.parentCommentAuthorId,
      rootCommentId: this.rootCommentId,
      tenantId: this.replyComment.tenantId,
      createdAt: this.replyComment.commentCreatedAt,
    };
  }

  /**
   * Creates the event from a reply comment and parent comment details
   */
  static create(
    replyComment: Comment,
    parentCommentAuthorId: string,
    rootCommentId?: string,
  ): ReplyNotificationEvent {
    return new ReplyNotificationEvent(
      replyComment,
      parentCommentAuthorId,
      rootCommentId,
    );
  }
}
