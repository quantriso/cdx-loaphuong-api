import type { CommentVoteDto } from '../../dtos/comment-vote.dto';

/**
 * Comment Vote Read DAO Port Interface
 *
 * Defines the contract for read operations on the Comment Vote module.
 * This is part of CQRS pattern - separating read from write operations.
 *
 * ## Architecture
 *
 * - **Pattern**: CQRS (Command Query Responsibility Segregation)
 * - **Purpose**: Optimize read operations independently from writes
 * - **Location**: Application layer (Ports)
 *
 * ## Methods
 *
 * - `findByCommentId`: Get all votes for a specific comment
 * - `findByUserId`: Get all votes by a specific user
 * - `findByCommentAndUserId`: Get a specific vote by comment and user
 * - `countByCommentId`: Count votes for a comment (grouped by type)
 * - `countByCommentIdAndType`: Count votes of a specific type for a comment
 */
export interface ICommentVoteReadDaoPort {
  /**
   * Find all votes for a specific comment
   *
   * @param commentId - Comment ID
   * @returns Array of CommentVoteDto
   */
  findByCommentId(commentId: string): Promise<CommentVoteDto[]>;

  /**
   * Find all votes by a specific user
   *
   * @param userId - User ID
   * @returns Array of CommentVoteDto
   */
  findByUserId(userId: string): Promise<CommentVoteDto[]>;

  /**
   * Find a specific vote by comment and user
   *
   * @param commentId - Comment ID
   * @param userId - User ID
   * @returns CommentVoteDto or null if not found
   */
  findByCommentAndUserId(
    commentId: string,
    userId: string,
  ): Promise<CommentVoteDto | null>;

  /**
   * Count votes for a comment, grouped by type
   *
   * @param commentId - Comment ID
   * @returns Object with likeCount and dislikeCount
   */
  countByCommentId(commentId: string): Promise<{
    likeCount: number;
    dislikeCount: number;
  }>;

  /**
   * Count votes of a specific type for a comment
   *
   * @param commentId - Comment ID
   * @param voteType - Vote type ('LIKE' or 'DISLIKE')
   * @returns Count of votes
   */
  countByCommentIdAndType(
    commentId: string,
    voteType: 'LIKE' | 'DISLIKE',
  ): Promise<number>;

  /**
   * Invalidate cache for votes of a specific comment
   *
   * @param commentId - Comment ID
   */
  invalidateCache(commentId: string): Promise<void>;
}
