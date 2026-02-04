import { DomainException } from '@core/domain';

export class CommentLengthExceededException extends DomainException {
  constructor(message: string) {
    super(message, 'COMMENT_LENGTH_EXCEEDED');
  }
}
