import { ModerationStatus } from '../../domain/entities/comment.entity';

/**
 * Comment DTO for read operations
 *
 * Used in Query responses (Read Model).
 * Contains only data relevant for client consumption.
 */
export class CommentDto {
  /** Comment ID */
  id: string;

  /** Content ID that this comment belongs to */
  contentId: string;

  /** Parent comment ID for threaded replies (null for top-level comments) */
  parentId?: string | null;

  /** User ID who created the comment */
  authorId: string;

  /** Comment content text */
  content: string;

  /** Tenant ID for multi-tenant isolation */
  tenantId: string;

  /** Moderation status (PENDING, APPROVED, REJECTED) */
  moderationStatus: ModerationStatus;

  /** Array of mentioned user IDs */
  mentions?: string[];

  /** Creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;

  /** Nested replies to this comment */
  replies?: CommentDto[];

  constructor(
    id: string,
    contentId: string,
    parentId: string | null | undefined,
    authorId: string,
    content: string,
    tenantId: string,
    moderationStatus: ModerationStatus,
    mentions: string[] | undefined,
    createdAt: Date,
    updatedAt: Date,
    replies?: CommentDto[],
  ) {
    this.id = id;
    this.contentId = contentId;
    this.parentId = parentId || null;
    this.authorId = authorId;
    this.content = content;
    this.tenantId = tenantId;
    this.moderationStatus = moderationStatus;
    this.mentions = mentions;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.replies = replies;
  }

  /**
   * Factory method to create from raw data
   */
  static fromRaw(data: {
    id: string;
    contentId: string;
    parentId: string | null;
    authorId: string;
    content: string;
    tenantId: string;
    moderationStatus: ModerationStatus;
    mentions: string[] | null;
    createdAt: Date;
    updatedAt: Date;
  }): CommentDto {
    return new CommentDto(
      data.id,
      data.contentId,
      data.parentId,
      data.authorId,
      data.content,
      data.tenantId,
      data.moderationStatus,
      data.mentions || undefined,
      data.createdAt,
      data.updatedAt,
    );
  }
}

export class CreateCommentDto {
  contentId: string;
  content: string;
  parentCommentId?: string;
  mentions?: string[];
}

export class ReplyCommentDto {
  content: string;
  mentions?: string[];
}

export class UpdateCommentDto {
  content: string;
  mentions?: string[];
}

export class ModerationActionDto {
  status: 'APPROVED' | 'REJECTED';
  reason?: string;
}

export class CommentListDto {
  comments: CommentDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
