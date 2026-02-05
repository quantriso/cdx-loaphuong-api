import { IQuery } from '@core/application';
import { CommentVoteDto } from '../dtos/comment-vote.dto';

/**
 * Query to get votes for a specific comment
 *
 * Story 6.3: Like/dislike comment
 */
export class GetCommentVotesQuery extends IQuery<CommentVoteDto[]> {
  constructor(
    public readonly commentId: string,
    public readonly page: number = 1,
    public readonly limit: number = 10,
  ) {
    super();
  }
}
