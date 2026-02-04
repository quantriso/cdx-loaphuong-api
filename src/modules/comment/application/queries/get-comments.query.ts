import { IQuery } from '@core/application';
import { CommentListDto } from '../dtos/comment.dto';

export class GetCommentsQuery extends IQuery<CommentListDto> {
  constructor(
    public readonly contentId: string,
    public readonly tenantId: string,
    public readonly page: number = 1,
    public readonly limit: number = 20,
  ) {
    super();
  }
}
