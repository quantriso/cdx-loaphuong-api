import { ICommandHandler, CommandHandler } from '@nestjs/cqrs';
import { CreateCommentCommand } from '../create-comment.command';
import type { CommentRepositoryInterface } from '../../../domain/repositories/comment.repository.interface';
import { CommentId } from '../../../domain/value-objects/comment-id.value-object';
import { CommentContent } from '../../../domain/value-objects/comment-content.value-object';
import { Comment } from '../../../domain/entities/comment.entity';
import { ContentService } from '../../../domain/services/content.service';
import { RateLimitExceededException } from '../../../domain/exceptions/rate-limit-exceeded.exception';
import { CommentNotFoundException } from '../../../domain/exceptions/comment-not-found.exception';

/**
 * Create Comment Handler
 *
 * Story 6.1: Add comments on published content
 *
 * Handles the creation of new comments on published content.
 * Validates content publication status, checks rate limits, and ensures comment content meets requirements.
 */
@CommandHandler(CreateCommentCommand)
export class CreateCommentHandler implements ICommandHandler<CreateCommentCommand> {
  constructor(
    private readonly commentRepository: CommentRepositoryInterface,
    private readonly contentService: ContentService,
  ) {}

  async execute(command: CreateCommentCommand): Promise<string> {
    const {
      contentId,
      authorId,
      content,
      tenantId,
      parentCommentId,
      mentions,
    } = command;

    // Validate content exists and is published
    const isPublished = await this.contentService.isContentPublished(contentId);
    if (!isPublished) {
      throw new Error('Content must be published to allow comments');
    }

    // Check rate limit
    const isRateLimited = await this.contentService.checkRateLimit(
      authorId,
      tenantId,
    );
    if (isRateLimited) {
      throw new RateLimitExceededException(10, '1m');
    }

    // Validate parent comment if this is a reply
    if (parentCommentId) {
      const parentComment = await this.commentRepository.findById(
        CommentId.fromString(parentCommentId),
      );
      if (!parentComment) {
        throw new CommentNotFoundException('Parent comment not found');
      }
    }

    // Create comment entity using the factory method
    const commentContent = CommentContent.create(content, mentions);

    const comment = Comment.create(
      contentId,
      authorId,
      commentContent,
      tenantId,
      parentCommentId,
      mentions,
    );

    // Save comment (events are automatically published by repository)
    await this.commentRepository.save(comment);

    return comment.commentId;
  }
}
