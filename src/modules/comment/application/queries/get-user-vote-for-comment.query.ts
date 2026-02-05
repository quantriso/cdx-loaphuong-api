import { IQuery } from '@core/application';
import { CommentVoteDto } from '../dtos/comment-vote.dto';

/**
 * Query to get a specific user's vote for a comment
 *
 * Story 6.3: Like/dislike comment
 */
export class GetUserVoteForCommentQuery extends IQuery<CommentVoteDto | null> {
  constructor(
    public readonly commentId: string,
    public readonly userId: string,
  ) {
    super();
  }
}
