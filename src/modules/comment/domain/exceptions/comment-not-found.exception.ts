import { DomainException } from '@core/domain';

export class CommentNotFoundException extends DomainException {
  constructor(commentId: string) {
    super(`Comment with ID "${commentId}" not found`, 'COMMENT_NOT_FOUND', {
      commentId,
    });
  }
}
