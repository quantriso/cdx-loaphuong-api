import { DomainException } from '@core/domain';

/**
 * Vote Not Found Exception
 * Thrown when a user tries to remove a vote that doesn't exist
 */
export class VoteNotFoundException extends DomainException {
  constructor(commentId: string, userId: string) {
    super(`User ${userId} has not voted on comment ${commentId}`);
    this.name = 'VoteNotFoundException';
  }
}
