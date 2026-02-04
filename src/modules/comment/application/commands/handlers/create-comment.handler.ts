import { ICommandHandler, CommandHandler } from '@nestjs/cqrs';
import { CreateCommentCommand } from '../create-comment.command';
import type { CommentRepositoryInterface } from '../../../domain/repositories/comment.repository.interface';
import { CommentId } from '../../../domain/value-objects/comment-id.value-object';
import { CommentContent } from '../../../domain/value-objects/comment-content.value-object';
import { Comment } from '../../../domain/entities/comment.entity';
import { ContentService } from '../../../domain/services/content.service';
import { ContentAvailabilityService } from '../../../domain/services/content-availability.service';
import { ThreadService } from '../../../domain/services/thread.service';
import { RateLimitExceededException } from '../../../domain/exceptions/rate-limit-exceeded.exception';
import { CommentNotFoundException } from '../../../domain/exceptions/comment-not-found.exception';
import { ReplyNotificationEvent } from '../../../domain/events/reply-notification.event';

/**
 * Create Comment Handler
 *
 * Story 6.1: Add comments on published content
 * Story 6.2: Reply to comment
 *
 * Handles the creation of new comments on published content.
 * Validates content publication status, checks rate limits, ensures comment content meets requirements,
 * and validates thread depth for reply comments.
 */
@CommandHandler(CreateCommentCommand)
export class CreateCommentHandler implements ICommandHandler<CreateCommentCommand> {
  constructor(
    private readonly commentRepository: CommentRepositoryInterface,
    private readonly contentService: ContentService,
    private readonly contentAvailabilityService: ContentAvailabilityService,
    private readonly threadService: ThreadService,
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
    try {
      await this.contentAvailabilityService.ensureContentIsPublished(
        contentId,
        tenantId,
      );
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw error;
    }

    // Check rate limit
    const isRateLimited = await this.contentService.checkRateLimit(
      authorId,
      tenantId,
    );
    if (isRateLimited) {
      throw new RateLimitExceededException(10, '1m');
    }

    // Validate parent comment and thread depth if this is a reply
    let rootCommentId: string | undefined;
    if (parentCommentId) {
      const parentComment = await this.commentRepository.findById(
        CommentId.fromString(parentCommentId),
      );
      if (!parentComment) {
        throw new CommentNotFoundException('Parent comment not found');
      }

      // Validate thread depth (max 3 levels deep as per ThreadService)
      const threadDepth = await this.threadService.calculateThreadDepth(
        CommentId.fromString(parentCommentId),
      );
      if (threadDepth >= 3) {
        throw new Error('Maximum thread depth exceeded (3 levels)');
      }

      // Find root comment ID for notification context
      rootCommentId = parentComment.parentCommentId
        ? await this.threadService.findRootCommentId(parentCommentId)
        : parentCommentId;
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
