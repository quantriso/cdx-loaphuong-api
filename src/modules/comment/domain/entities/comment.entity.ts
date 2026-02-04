import { AggregateRoot } from '@core/domain';
import { CommentId } from '../value-objects/comment-id.value-object';
import { CommentContent } from '../value-objects/comment-content.value-object';
import { CommentCreatedEvent } from '../events/comment-created.event';
import { MentionedUserNotificationEvent } from '../events/mentioned-user-notification.event';

export enum ModerationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface CommentProps {
  id: string;
  contentId: string;
  parentCommentId?: string;
  authorId: string;
  content: CommentContent;
  tenantId: string;
  moderationStatus: ModerationStatus;
  mentions?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class Comment extends AggregateRoot {
  private _props: CommentProps;

  private constructor(id: CommentId, props: CommentProps) {
    super(id.value, 1, props.createdAt, props.updatedAt);
    this._props = props;
  }

  get commentId(): string {
    return this._props.id;
  }

  get contentId(): string {
    return this._props.contentId;
  }

  get parentCommentId(): string | undefined {
    return this._props.parentCommentId;
  }

  get authorId(): string {
    return this._props.authorId;
  }

  get content(): CommentContent {
    return this._props.content;
  }

  get tenantId(): string {
    return this._props.tenantId;
  }

  get moderationStatus(): ModerationStatus {
    return this._props.moderationStatus;
  }

  get mentions(): string[] {
    return this._props.mentions || [];
  }

  get commentCreatedAt(): Date {
    return this._props.createdAt;
  }

  get commentUpdatedAt(): Date {
    return this._props.updatedAt;
  }

  static create(
    contentId: string,
    authorId: string,
    content: CommentContent,
    tenantId: string,
    parentCommentId?: string,
    mentions?: string[],
  ): Comment {
    const id = CommentId.generate();
    const now = new Date();

    const props: CommentProps = {
      id: id.toString(),
      contentId,
      parentCommentId,
      authorId,
      content,
      tenantId,
      moderationStatus: ModerationStatus.PENDING,
      mentions,
      createdAt: now,
      updatedAt: now,
    };

    const comment = new Comment(id, props);

    // Add domain event for comment created
    comment.addDomainEvent(
      new CommentCreatedEvent(comment.commentId, {
        contentId: comment.contentId,
        userId: comment.authorId,
        content: comment.content.value,
        tenantId: comment.tenantId,
        mentions: comment.mentions,
      }),
    );

    // Add notification events for each mentioned user
    comment.mentions.forEach((mentionedUserId) => {
      comment.addDomainEvent(
        new MentionedUserNotificationEvent(comment.commentId, {
          commentId: comment.commentId,
          contentId: comment.contentId,
          mentionedUserId,
          mentionedByUserId: comment.authorId,
          commentContent: comment.content.value,
          tenantId: comment.tenantId,
        }),
      );
    });

    return comment;
  }

  static reconstitute(props: CommentProps): Comment {
    return new Comment(CommentId.fromString(props.id), props);
  }

  approve(): void {
    this._props.moderationStatus = ModerationStatus.APPROVED;
    this._props.updatedAt = new Date();
  }

  reject(): void {
    this._props.moderationStatus = ModerationStatus.REJECTED;
    this._props.updatedAt = new Date();
  }

  isApproved(): boolean {
    return this._props.moderationStatus === ModerationStatus.APPROVED;
  }

  isRejected(): boolean {
    return this._props.moderationStatus === ModerationStatus.REJECTED;
  }

  isPending(): boolean {
    return this._props.moderationStatus === ModerationStatus.PENDING;
  }

  isReply(): boolean {
    return !!this._props.parentCommentId;
  }

  toPrimitives(): CommentProps {
    return {
      id: this._props.id,
      contentId: this._props.contentId,
      parentCommentId: this._props.parentCommentId,
      authorId: this._props.authorId,
      content: this._props.content,
      tenantId: this._props.tenantId,
      moderationStatus: this._props.moderationStatus,
      mentions: this._props.mentions,
      createdAt: this._props.createdAt,
      updatedAt: this._props.updatedAt,
    };
  }

  private updateTimestamp(): void {
    this._props.updatedAt = new Date();
  }
}
