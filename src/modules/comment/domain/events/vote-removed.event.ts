import { BaseDomainEvent, IEventMetadata } from '@core/domain';
import { CommentVoteId } from '../value-objects/comment-vote-id.value-object';
import { CommentId } from '../value-objects/comment-id.value-object';
import { VoteType } from '../value-objects/vote-type.enum';

interface VoteRemovedData {
  voteId: string;
  commentId: string;
  userId: string;
  voteType: VoteType;
}

/**
 * Vote Removed Event
 * Emitted when a user removes their vote or changes their vote type
 */
export class VoteRemovedEvent extends BaseDomainEvent<VoteRemovedData> {
  constructor(
    aggregateId: string,
    data: VoteRemovedData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'CommentVote', 'VoteRemoved', data, metadata);
  }
}
