import { IQuery } from '@core/application';
import { CommentDto } from '../dtos/comment.dto';

/**
 * Get Comment By Id Query
 *
 * Retrieves a single comment by its ID
 */
export class GetCommentByIdQuery extends IQuery<CommentDto> {
  constructor(public readonly id: string) {
    super();
  }
}
