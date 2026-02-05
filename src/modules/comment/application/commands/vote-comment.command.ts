import { ICommand } from '@core/application';
import { VoteType } from '../../domain/value-objects/vote-type.enum';

/**
 * Command to cast a vote (like/dislike) on a comment
 */
export class VoteCommentCommand implements ICommand {
  constructor(
    public readonly commentId: string,
    public readonly userId: string,
    public readonly voteType: VoteType,
  ) {}
}
