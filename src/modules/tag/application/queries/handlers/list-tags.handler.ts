import type { IQueryHandler } from '@core/application';
import { QueryHandler } from '@shared/cqrs';
import { Inject } from '@nestjs/common';
import { ListTagsQuery } from '../list-tags.query';
import type { TagResponseDto } from '../../dtos/tag-response.dto';
import type { ITagReadDao } from '../ports';
import { TAG_READ_DAO_TOKEN } from '../../../constants/tokens';

/**
 * List Tags Query Handler
 *
 * Story 4.3: Create, Edit, Delete Tags
 *
 * CQRS Pattern:
 * - Query handler (read side)
 * - Uses read DAO for optimized queries
 * - Returns paginated DTOs
 */
@QueryHandler(ListTagsQuery)
export class ListTagsHandler implements IQueryHandler<
  ListTagsQuery,
  { data: TagResponseDto[]; total: number }
> {
  constructor(
    @Inject(TAG_READ_DAO_TOKEN)
    private readonly tagReadDao: ITagReadDao,
  ) {}

  async execute(
    query: ListTagsQuery,
  ): Promise<{ data: TagResponseDto[]; total: number }> {
    const { tenantId, isActive, page, limit } = query;

    return this.tagReadDao.findAll(tenantId, isActive, page, limit);
  }
}
