import { Comment } from '../entities/comment.entity';
import { CommentId } from '../value-objects/comment-id.value-object';
import { MaxThreadDepthExceededException } from '../exceptions/max-thread-depth-exceeded.exception';
import type { CommentRepositoryInterface } from '../repositories/comment.repository.interface';

/**
 * Thread Service
 *
 * Story 6.2: Reply to comment
 *
 * Domain service responsible for managing comment thread operations:
 * - Calculating thread depth
 * - Validating maximum thread depth limits
 * - Traversing comment hierarchies
 *
 * The service enforces a maximum thread depth of 3 levels:
 * Level 0: Root comment
 * Level 1: Reply to root comment
 * Level 2: Reply to level 1 comment (max allowed)
 */
export class ThreadService {
  private readonly MAX_THREAD_DEPTH = 3;

  constructor(private readonly commentRepository: CommentRepositoryInterface) {}

  /**
   * Validates that creating a reply to the given parent comment
   * would not exceed the maximum allowed thread depth.
   *
   * @param parentCommentId - The ID of the comment being replied to
   * @throws MaxThreadDepthExceededException if depth would be exceeded
   */
  async validateThreadDepth(parentCommentId: CommentId): Promise<void> {
    const depth = await this.calculateThreadDepth(parentCommentId);
    const newDepth = depth + 1;

    if (newDepth > this.MAX_THREAD_DEPTH) {
      throw new MaxThreadDepthExceededException(
        this.MAX_THREAD_DEPTH,
        newDepth,
      );
    }
  }

  /**
   * Calculates the depth of a comment in the thread hierarchy.
   * Root comments have depth 0, direct replies have depth 1, etc.
   *
   * @param commentId - The ID of the comment to calculate depth for
   * @returns The depth level of the comment
   */
  async calculateThreadDepth(commentId: CommentId): Promise<number> {
    let currentComment = await this.commentRepository.findById(commentId);
    let depth = 0;

    // Traverse up the thread until we reach a root comment
    while (currentComment && currentComment.isReply()) {
      depth++;
      const parentId = currentComment.parentCommentId;
      if (!parentId) {
        break;
      }
      currentComment = await this.commentRepository.findById(
        CommentId.fromString(parentId),
      );
    }

    return depth;
  }

  /**
   * Builds the complete thread structure for a given root comment.
   * Returns the root comment with all its replies nested hierarchically.
   *
   * @param rootCommentId - The ID of the root comment
   * @returns The complete thread structure or null if not found
   */
  async buildThreadStructure(
    rootCommentId: CommentId,
  ): Promise<ThreadNode | null> {
    const rootComment = await this.commentRepository.findById(rootCommentId);

    if (!rootComment || rootComment.isReply()) {
      return null;
    }

    return this.buildThreadNode(rootComment);
  }

  /**
   * Builds a thread node with all its replies recursively.
   *
   * @param comment - The comment to build a node for
   * @returns A thread node with nested replies
   */
  private async buildThreadNode(comment: Comment): Promise<ThreadNode> {
    const replies = await this.commentRepository.findReplies(
      comment.commentId,
      comment.tenantId,
    );

    const children: ThreadNode[] = [];

    for (const reply of replies) {
      children.push(await this.buildThreadNode(reply));
    }

    return {
      comment,
      replies: children,
      depth: await this.calculateThreadDepth(
        CommentId.fromString(comment.commentId),
      ),
      replyCount: await this.countReplies(comment.commentId, comment.tenantId),
    };
  }

  /**
   * Counts the total number of replies for a comment (including nested replies).
   *
   * @param commentId - The ID of the comment
   * @param tenantId - The tenant ID
   * @returns The total number of replies
   */
  async countReplies(commentId: string, tenantId: string): Promise<number> {
    const replies = await this.commentRepository.findReplies(
      commentId,
      tenantId,
    );
    let count = replies.length;

    for (const reply of replies) {
      count += await this.countReplies(reply.commentId, reply.tenantId);
    }

    return count;
  }

  /**
   * Gets the maximum depth of a thread starting from a root comment.
   *
   * @param rootCommentId - The ID of the root comment
   * @returns The maximum depth of the thread, or -1 if not found
   */
  async getThreadMaxDepth(rootCommentId: CommentId): Promise<number> {
    const rootComment = await this.commentRepository.findById(rootCommentId);

    if (!rootComment || rootComment.isReply()) {
      return -1;
    }

    return this.calculateMaxDepth(rootComment);
  }

  /**
   * Recursively calculates the maximum depth of a thread.
   *
   * @param comment - The comment to start from
   * @returns The maximum depth from this point
   */
  private async calculateMaxDepth(comment: Comment): Promise<number> {
    const replies = await this.commentRepository.findReplies(
      comment.commentId,
      comment.tenantId,
    );

    if (replies.length === 0) {
      return 0;
    }

    let maxChildDepth = 0;

    for (const reply of replies) {
      const childDepth = await this.calculateMaxDepth(reply);
      if (childDepth > maxChildDepth) {
        maxChildDepth = childDepth;
      }
    }

    return maxChildDepth + 1;
  }

  /**
   * Finds the root comment ID by traversing up the thread hierarchy.
   *
   * @param commentId - The ID of the comment to start from
   * @returns The ID of the root comment
   */
  async findRootCommentId(commentId: string): Promise<string> {
    let currentComment = await this.commentRepository.findById(
      CommentId.fromString(commentId),
    );

    // Traverse up the thread until we find a root comment
    while (currentComment && currentComment.isReply()) {
      const parentId = currentComment.parentCommentId;
      if (!parentId) {
        break;
      }
      currentComment = await this.commentRepository.findById(
        CommentId.fromString(parentId),
      );
    }

    return currentComment ? currentComment.commentId : commentId;
  }
}

/**
 * Thread Node Interface
 *
 * Represents a comment in a thread structure with its replies.
 */
export interface ThreadNode {
  comment: Comment;
  replies: ThreadNode[];
  depth: number;
  replyCount: number;
}
