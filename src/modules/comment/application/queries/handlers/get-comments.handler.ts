import { Injectable, Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetCommentsQuery } from '../get-comments.query';
import type { ICommentReadDaoPort } from '../ports/comment-read-dao.interface';
import { CommentListDto } from '../../dtos/comment.dto';
import { COMMENT_READ_DAO_TOKEN } from '../../../constants';

/**
 * Get Comments Handler
 *
 * Story 6.1: Add comments on published content
 *
 * Retrieves paginated comments for a specific piece of content using Read DAO (CQRS pattern)
 *
 * Business Rules:
 * - Only return comments belonging to the tenant
 * - Support pagination
 * - Return DTOs, not domain entities (query side)
 */
@QueryHandler(GetCommentsQuery)
@Injectable()
export class GetCommentsHandler implements IQueryHandler<
  GetCommentsQuery,
  CommentListDto
> {
  constructor(
    @Inject(COMMENT_READ_DAO_TOKEN)
    private readonly commentReadDao: ICommentReadDaoPort,
  ) {}

  async execute(query: GetCommentsQuery): Promise<CommentListDto> {
    const { contentId, page, limit, tenantId } = query;

    const { comments, total } = await this.commentReadDao.findPaginated({
      contentId,
      tenantId,
      page,
      limit,
      includeReplies: false,
    });

    const commentList = new CommentListDto();
    commentList.comments = comments;
    commentList.total = total;
    commentList.page = page;
    commentList.limit = limit;
    commentList.totalPages = Math.ceil(total / limit);

    return commentList;
  }
}
