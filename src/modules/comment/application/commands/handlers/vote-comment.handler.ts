import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import type { ICommentVoteRepository } from '../../../domain/repositories/comment-vote.repository.interface';
import type { CommentRepositoryInterface } from '../../../domain/repositories/comment.repository.interface';
import { CommentVote } from '../../../domain/entities/comment-vote.entity';
import { CommentId } from '../../../domain/value-objects/comment-id.value-object';
import { DuplicateVoteException } from '../../../domain/exceptions/duplicate-vote.exception';
import { CommentNotFoundException } from '../../../domain/exceptions/comment-not-found.exception';
import { CommentNotApprovedException } from '../../../domain/exceptions/comment-not-approved.exception';
import { VoteCommentCommand } from '../../commands/vote-comment.command';
import { CommentDto } from '../../dtos/comment.dto';

/**
 * Handler for VoteCommentCommand
 * Handles casting a vote (like/dislike) on a comment
 *
 * Story 6.3: Like/dislike comment
 *
 * Business Rules:
 * - User can only vote once per comment (AC #1)
 * - User can change their vote from like to dislike or vice versa (AC #2)
 * - System tracks like/dislike counts (AC #3)
 * - Only authenticated users can vote (AC #4)
 * - Comments can be voted multiple times by different users (AC #5)
 * - Vote changes update counts appropriately (AC #6)
 * - Only approved comments can be voted on (AC #7)
 */
@CommandHandler(VoteCommentCommand)
export class VoteCommentHandler implements ICommandHandler<
  VoteCommentCommand,
  { comment: CommentDto; voted: boolean; voteType: 'LIKE' | 'DISLIKE' }
> {
  constructor(
    @Inject('ICommentVoteRepository')
    private readonly voteRepository: ICommentVoteRepository,
    @Inject('CommentRepositoryInterface')
    private readonly commentRepository: CommentRepositoryInterface,
  ) {}

  async execute(command: VoteCommentCommand): Promise<{
    comment: CommentDto;
    voted: boolean;
    voteType: 'LIKE' | 'DISLIKE';
  }> {
    const commentId = CommentId.fromString(command.commentId);

    // Verify comment exists (AC #3, AC #7)
    const comment = await this.commentRepository.findById(commentId);
    if (!comment) {
      throw new CommentNotFoundException(command.commentId);
    }

    // Verify comment is approved (AC #7)
    if (comment.moderationStatus !== 'APPROVED') {
      throw new CommentNotApprovedException(
        command.commentId,
        comment.moderationStatus,
      );
    }

    // Check if user already voted on this comment (AC #1)
    const existingVote = await this.voteRepository.findByCommentAndUserId(
      commentId,
      command.userId,
    );

    if (existingVote) {
      if (existingVote.voteType === command.voteType) {
        // User is voting with the same type - this is a duplicate vote (AC #1)
        throw new DuplicateVoteException(
          command.commentId,
          command.userId,
          command.voteType,
        );
      } else {
        // User is changing their vote type (AC #2, AC #6)
        const oldVoteType = existingVote.voteType;
        existingVote.changeVoteType(command.voteType);
        await this.voteRepository.update(existingVote);

        // Update comment counts (AC #3, AC #6)
        await this.updateCommentCountsOnVoteChange(
          commentId.value,
          oldVoteType,
          command.voteType,
        );

        // Event is published automatically by repository

        // Return updated comment
        const updatedComment = await this.commentRepository.findById(commentId);
        if (!updatedComment) {
          throw new CommentNotFoundException(command.commentId);
        }

        return {
          comment: this.toDto(updatedComment),
          voted: true,
          voteType: command.voteType,
        };
      }
    }

    // Create new vote (AC #3, AC #5)
    const vote = CommentVote.create(
      commentId,
      command.userId,
      command.voteType,
    );

    await this.voteRepository.save(vote);

    // Update comment count (AC #3)
    await this.updateCommentCount(commentId.value, command.voteType);

    // Event is published automatically by repository

    // Return updated comment
    const updatedComment = await this.commentRepository.findById(commentId);
    if (!updatedComment) {
      throw new CommentNotFoundException(command.commentId);
    }

    return {
      comment: this.toDto(updatedComment),
      voted: true,
      voteType: command.voteType,
    };
  }

  /**
   * Update comment like/dislike counts when user changes their vote
   *
   * AC #6: Vote changes should update counts appropriately
   */
  private async updateCommentCountsOnVoteChange(
    commentId: string,
    oldVoteType: 'LIKE' | 'DISLIKE',
    newVoteType: 'LIKE' | 'DISLIKE',
  ): Promise<void> {
    // Decrement old vote type count
    if (oldVoteType === 'LIKE') {
      await this.commentRepository.decrementLikeCount(commentId);
    } else {
      await this.commentRepository.decrementDislikeCount(commentId);
    }

    // Increment new vote type count
    if (newVoteType === 'LIKE') {
      await this.commentRepository.incrementLikeCount(commentId);
    } else {
      await this.commentRepository.incrementDislikeCount(commentId);
    }
  }

  /**
   * Update comment like/dislike count for a new vote
   *
   * AC #3: System should track like/dislike counts
   */
  private async updateCommentCount(
    commentId: string,
    voteType: 'LIKE' | 'DISLIKE',
  ): Promise<void> {
    if (voteType === 'LIKE') {
      await this.commentRepository.incrementLikeCount(commentId);
    } else {
      await this.commentRepository.incrementDislikeCount(commentId);
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
