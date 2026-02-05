import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import type { ICommentVoteRepository } from '../../../domain/repositories/comment-vote.repository.interface';
import type { CommentRepositoryInterface } from '../../../domain/repositories/comment.repository.interface';
import { CommentVote } from '../../../domain/entities/comment-vote.entity';
import { CommentId } from '../../../domain/value-objects/comment-id.value-object';
import { CommentVoteId } from '../../../domain/value-objects/comment-vote-id.value-object';
import { VoteNotFoundException } from '../../../domain/exceptions/vote-not-found.exception';
import { RemoveVoteCommand } from '../../commands/remove-vote.command';
import { CommentDto } from '../../dtos/comment.dto';

/**
 * Handler for RemoveVoteCommand
 * Handles removing a user's vote from a comment
 *
 * Story 6.3: Like/dislike comment
 *
 * Business Rules:
 * - Users can remove their vote from a comment
 * - Vote removal should decrement the appropriate count
 * - Returns updated comment with counts
 */
@CommandHandler(RemoveVoteCommand)
export class RemoveVoteHandler implements ICommandHandler<
  RemoveVoteCommand,
  CommentDto
> {
  constructor(
    @Inject('ICommentVoteRepository')
    private readonly voteRepository: ICommentVoteRepository,
    @Inject('CommentRepositoryInterface')
    private readonly commentRepository: CommentRepositoryInterface,
  ) {}

  async execute(command: RemoveVoteCommand): Promise<CommentDto> {
    const commentId = CommentId.fromString(command.commentId);

    // Find existing vote
    const existingVote = await this.voteRepository.findByCommentAndUserId(
      commentId,
      command.userId,
    );

    if (!existingVote) {
      throw new VoteNotFoundException(command.commentId, command.userId);
    }

    // Store vote type before deletion
    const voteType = existingVote.voteType;

    // Mark vote for removal (domain event will be emitted)
    existingVote.removeVote();

    // Delete the vote from repository
    await this.voteRepository.delete(
      CommentVoteId.fromString(existingVote.getId()),
    );

    // Update comment count
    await this.updateCommentCount(commentId.value, voteType);

    // Return updated comment
    const updatedComment = await this.commentRepository.findById(commentId);
    if (!updatedComment) {
      throw new Error('Comment not found after vote removal');
    }

    return this.toDto(updatedComment);
  }

  /**
   * Update comment like/dislike count when vote is removed
   */
  private async updateCommentCount(
    commentId: string,
    voteType: 'LIKE' | 'DISLIKE',
  ): Promise<void> {
    if (voteType === 'LIKE') {
      await this.commentRepository.decrementLikeCount(commentId);
    } else {
      await this.commentRepository.decrementDislikeCount(commentId);
    }
  }

  /**
   * Convert Comment entity to DTO
   */
  private toDto(comment: any): CommentDto {
    return CommentDto.fromRaw({
      id: comment.commentId,
      contentId: comment.contentId,
      parentId: comment.parentCommentId || null,
      authorId: comment.authorId,
      content: comment.content.value,
      tenantId: comment.tenantId,
      moderationStatus: comment.moderationStatus,
      mentions: comment.mentions || null,
      likeCount: comment.likeCount,
      dislikeCount: comment.dislikeCount,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    });
  }
}
