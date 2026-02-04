import { Comment, CommentProps } from '../entities/comment.entity';
import { CommentId } from '../value-objects/comment-id.value-object';

export interface CommentRepositoryInterface {
  /**
   * Save a new comment
   */
  save(comment: Comment): Promise<void>;

  /**
   * Update an existing comment
   */
  update(comment: Comment): Promise<void>;

  /**
   * Find comment by ID
   */
  findById(id: CommentId): Promise<Comment | null>;

  /**
   * Find comment by ID (throws if not found)
   */
  getById(id: CommentId): Promise<Comment>;

  /**
   * Find all comments for a content
   */
  findByContentId(contentId: string, tenantId: string): Promise<Comment[]>;

  /**
   * Find replies for a comment
   */
  findReplies(parentCommentId: string, tenantId: string): Promise<Comment[]>;

  /**
   * Find all comments by author
   */
  findByAuthorId(authorId: string, tenantId: string): Promise<Comment[]>;

  /**
   * Find comments by moderation status
   */
  findByModerationStatus(
    status: string,
    tenantId: string,
    limit?: number,
  ): Promise<Comment[]>;

  /**
   * Delete a comment (soft delete)
   */
  delete(id: CommentId): Promise<void>;

  /**
   * Check if comment exists
   */
  exists(id: CommentId): Promise<boolean>;

  /**
   * Count comments for content
   */
  countByContentId(contentId: string, tenantId: string): Promise<number>;

  /**
   * Get comments with pagination
   */
  findPaginated(params: {
    contentId?: string;
    tenantId: string;
    page: number;
    limit: number;
    includeReplies?: boolean;
  }): Promise<{ comments: Comment[]; total: number }>;
}
