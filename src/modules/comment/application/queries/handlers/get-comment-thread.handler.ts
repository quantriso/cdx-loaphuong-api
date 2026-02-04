import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetCommentThreadQuery } from '../../queries/get-comment-thread.query';
import { CommentId } from '../../../domain/value-objects/comment-id.value-object';
import { ThreadService } from '../../../domain/services/thread.service';
import { CommentNotFoundException } from '../../../domain/exceptions/comment-not-found.exception';
import type { CommentThreadDto } from '../../dtos/thread.dto';

/**
 * Get Comment Thread Handler
 *
 * Story 6.2: Reply to comment
 *
 * Retrieves the complete thread structure for a given comment.
 * Returns the comment with all its replies organized hierarchically.
 */
@QueryHandler(GetCommentThreadQuery)
export class GetCommentThreadHandler implements IQueryHandler<
  GetCommentThreadQuery,
  CommentThreadDto
> {
  constructor(private readonly threadService: ThreadService) {}

  async execute(query: GetCommentThreadQuery): Promise<CommentThreadDto> {
    const { commentId } = query;

    // Build the thread structure using ThreadService
    const threadNode = await this.threadService.buildThreadStructure(
      CommentId.fromString(commentId),
    );

    if (!threadNode) {
      throw new CommentNotFoundException('Comment not found');
    }

    // Get the maximum depth of the thread
    const maxDepth = await this.threadService.getThreadMaxDepth(
      CommentId.fromString(commentId),
    );

    // Convert to DTO format
    return {
      comment: this.toCommentDto(threadNode.comment),
      replies: this.mapThreadNodesToDtos(threadNode.replies),
      depth: threadNode.depth,
      replyCount: threadNode.replyCount,
      maxDepth,
    };
  }

  /**
   * Maps thread nodes to DTO format recursively.
   */
  private mapThreadNodesToDtos(nodes: any[]): any[] {
    return nodes.map((node) => ({
      comment: this.toCommentDto(node.comment),
      replies: this.mapThreadNodesToDtos(node.replies),
      depth: node.depth,
      replyCount: node.replyCount,
    }));
  }

  /**
   * Converts a comment entity to DTO format.
   */
  private toCommentDto(comment: any): any {
    return {
      id: comment.commentId,
      contentId: comment.contentId,
      authorId: comment.authorId,
      content: comment.content,
      mentions: comment.mentions || [],
      tenantId: comment.tenantId,
      parentCommentId: comment.parentCommentId,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      isDeleted: comment.isDeleted,
      deletedAt: comment.deletedAt,
      deletedBy: comment.deletedBy,
    };
  }
}
