import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { COMMENT_VOTE_READ_DAO_TOKEN } from '../../../constants';
import type { ICommentVoteReadDaoPort } from '../ports/comment-vote-read-dao.interface';
import { GetCommentVotesQuery } from '../get-comment-votes.query';
import type { CommentVoteDto } from '../../dtos/comment-vote.dto';

/**
 * Handler for getting votes for a comment
 *
 * Story 6.3: Like/dislike comment
 *
 * Uses CQRS pattern - query handler uses read-optimized DAO
 */
@QueryHandler(GetCommentVotesQuery)
export class GetCommentVotesHandler implements IQueryHandler<
  GetCommentVotesQuery,
  CommentVoteDto[]
> {
  constructor(
    @Inject(COMMENT_VOTE_READ_DAO_TOKEN)
    private readonly voteReadDao: ICommentVoteReadDaoPort,
  ) {}

  async execute(query: GetCommentVotesQuery): Promise<CommentVoteDto[]> {
    const { commentId } = query;

    // Use read-optimized DAO (CQRS pattern)
    const votes = await this.voteReadDao.findByCommentId(commentId);

    return votes;
  }
}
