import { BaseDomainEvent, IEventMetadata } from '@core/domain';
import { CommentVoteId } from '../value-objects/comment-vote-id.value-object';
import { CommentId } from '../value-objects/comment-id.value-object';
import { VoteType } from '../value-objects/vote-type.enum';

interface VoteCastedData {
  voteId: string;
  commentId: string;
  userId: string;
  voteType: VoteType;
}

/**
 * Vote Casted Event
 * Emitted when a user casts a vote (like/dislike) on a comment
 */
export class VoteCastedEvent extends BaseDomainEvent<VoteCastedData> {
  constructor(
    aggregateId: string,
    data: VoteCastedData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'CommentVote', 'VoteCasted', data, metadata);
  }
}
