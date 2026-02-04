import { Injectable, Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetCommentByIdQuery } from '../../queries/get-comment-by-id.query';
import { CommentDto } from '../../dtos/comment.dto';
import { COMMENT_READ_DAO_TOKEN } from '../../../constants';
import type { ICommentReadDaoPort } from '../../queries/ports/comment-read-dao.interface';
import { CommentNotFoundException } from '../../../domain/exceptions/comment-not-found.exception';

/**
 * Get Comment By Id Query Handler
 *
 * Retrieves a single comment by its ID
 */
@QueryHandler(GetCommentByIdQuery)
@Injectable()
export class GetCommentByIdHandler implements IQueryHandler<
  GetCommentByIdQuery,
  CommentDto
> {
  constructor(
    @Inject(COMMENT_READ_DAO_TOKEN)
    private readonly commentReadDao: ICommentReadDaoPort,
  ) {}

  async execute(query: GetCommentByIdQuery): Promise<CommentDto> {
    const comment = await this.commentReadDao.findById(query.id, 'default');

    if (!comment) {
      throw new CommentNotFoundException(query.id);
    }

    return comment;
  }
}
