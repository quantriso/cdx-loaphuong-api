import type { CommentDto } from '../../dtos/comment.dto';

/**
 * Comment Read DAO Port (Data Access Object)
 *
 * Story 6.1: Add comments on published content
 *
 * Provides read-only access to comment data for query operations.
 * Follows CQRS pattern by separating read concerns from write concerns.
 *
 * This interface defines the contract for retrieving comment data
 * optimized for read operations, independent of the write repository.
 */
export interface ICommentReadDaoPort {
  /**
   * Find comments for a specific content with pagination
   */
  findPaginated(params: {
    contentId?: string;
    tenantId: string;
    page: number;
    limit: number;
    includeReplies?: boolean;
  }): Promise<{ comments: CommentDto[]; total: number }>;

  /**
   * Find comments by content ID
   */
  findByContentId(contentId: string, tenantId: string): Promise<CommentDto[]>;

  /**
   * Find replies to a specific comment
   */
  findReplies(parentCommentId: string, tenantId: string): Promise<CommentDto[]>;

  /**
   * Find comments by author ID
   */
  findByAuthorId(authorId: string, tenantId: string): Promise<CommentDto[]>;

  /**
   * Find comments by moderation status
   */
  findByModerationStatus(
    status: string,
    tenantId: string,
    limit?: number,
  ): Promise<CommentDto[]>;

  /**
   * Count comments for a specific content
   */
  countByContentId(contentId: string, tenantId: string): Promise<number>;

  /**
   * Find a single comment by ID
   */
  findById(id: string, tenantId: string): Promise<CommentDto | null>;
}
