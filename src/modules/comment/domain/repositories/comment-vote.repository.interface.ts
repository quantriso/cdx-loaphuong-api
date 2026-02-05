import { CommentVote } from '../entities/comment-vote.entity';
import { CommentVoteId } from '../value-objects/comment-vote-id.value-object';
import { CommentId } from '../value-objects/comment-id.value-object';

/**
 * Repository interface for CommentVote aggregate
 */
export interface ICommentVoteRepository {
  /**
   * Save a new vote
   */
  save(vote: CommentVote): Promise<void>;

  /**
   * Update an existing vote
   */
  update(vote: CommentVote): Promise<void>;

  /**
   * Delete a vote
   */
  delete(voteId: CommentVoteId): Promise<void>;

  /**
   * Find a vote by ID
   */
  findById(voteId: CommentVoteId): Promise<CommentVote | null>;

  /**
   * Find a user's vote on a specific comment
   */
  findByCommentAndUserId(
    commentId: CommentId,
    userId: string,
  ): Promise<CommentVote | null>;

  /**
   * Find all votes for a comment
   */
  findByCommentId(commentId: CommentId): Promise<CommentVote[]>;

  /**
   * Count votes for a comment by type
   */
  countByCommentIdAndType(
    commentId: CommentId,
    voteType: 'LIKE' | 'DISLIKE',
  ): Promise<number>;

  /**
   * Check if user has voted on a comment
   */
  existsByCommentAndUserId(
    commentId: CommentId,
    userId: string,
  ): Promise<boolean>;
}
