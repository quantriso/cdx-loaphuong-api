import { DomainException } from '@core/domain';
import { VoteType } from '../value-objects/vote-type.enum';

/**
 * Duplicate Vote Exception
 * Thrown when a user tries to vote on a comment they have already voted on
 */
export class DuplicateVoteException extends DomainException {
  constructor(commentId: string, userId: string, voteType: VoteType) {
    super(
      `User ${userId} has already ${voteType === VoteType.LIKE ? 'liked' : 'disliked'} comment ${commentId}`,
    );
    this.name = 'DuplicateVoteException';
  }
}
