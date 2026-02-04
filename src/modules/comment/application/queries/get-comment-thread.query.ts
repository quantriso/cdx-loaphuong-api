import { IQuery } from '@nestjs/cqrs';

/**
 * Get Comment Thread Query
 *
 * Story 6.2: Reply to comment
 *
 * Query to retrieve the complete thread structure for a given comment.
 * Returns the comment with all its replies organized hierarchically.
 */
export class GetCommentThreadQuery implements IQuery {
  constructor(
    public readonly commentId: string,
    public readonly tenantId: string,
  ) {}
}
