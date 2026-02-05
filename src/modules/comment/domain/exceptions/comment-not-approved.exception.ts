import { DomainException } from '@core/domain';

/**
 * Exception thrown when trying to vote on a comment that is not approved
 *
 * Story 6.3: Like/dislike comment
 * AC #7: Only approved comments can be liked/disliked
 */
export class CommentNotApprovedException extends DomainException {
  constructor(commentId: string, currentStatus: string) {
    super(
      `Comment ${commentId} cannot be voted on because it is not approved. Current status: ${currentStatus}`,
      'COMMENT_NOT_APPROVED',
      {
        commentId,
        currentStatus,
      },
    );
  }
}
