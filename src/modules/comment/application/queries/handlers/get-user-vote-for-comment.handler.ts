import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import type { ICommentVoteReadDaoPort } from '../ports/comment-vote-read-dao.interface';
import { GetUserVoteForCommentQuery } from '../get-user-vote-for-comment.query';
import type { CommentVoteDto } from '../../dtos/comment-vote.dto';
import { COMMENT_VOTE_READ_DAO_TOKEN } from '../../../constants';

/**
 * Handler for getting a specific user's vote for a comment
 *
 * Story 6.3: Like/dislike comment
 *
 * Uses CQRS pattern - query handler uses read-optimized DAO
 */
@QueryHandler(GetUserVoteForCommentQuery)
export class GetUserVoteForCommentHandler implements IQueryHandler<
  GetUserVoteForCommentQuery,
  CommentVoteDto | null
> {
  constructor(
    @Inject(COMMENT_VOTE_READ_DAO_TOKEN)
    private readonly voteReadDao: ICommentVoteReadDaoPort,
  ) {}

  async execute(
    query: GetUserVoteForCommentQuery,
  ): Promise<CommentVoteDto | null> {
    const { commentId, userId } = query;

    // Use read-optimized DAO (CQRS pattern)
    const vote = await this.voteReadDao.findByCommentAndUserId(
      commentId,
      userId,
    );

    if (!vote) {
      return null;
    }

    return vote;
  }
}
