import type { IQueryHandler } from '@core/application';
import { QueryHandler } from '@shared/cqrs';
import { Inject } from '@nestjs/common';
import { NotFoundException } from '@core/common';
import { GetTagQuery } from '../get-tag.query';
import type { TagResponseDto } from '../../dtos/tag-response.dto';
import type { ITagReadDao } from '../ports';
import { TAG_READ_DAO_TOKEN } from '../../../constants/tokens';

/**
 * Get Tag Query Handler
 *
 * Story 4.3: Create, Edit, Delete Tags
 *
 * CQRS Pattern:
 * - Query handler (read side)
 * - Uses read DAO for optimized queries
 * - Returns DTO (not domain entity)
 */
@QueryHandler(GetTagQuery)
export class GetTagHandler implements IQueryHandler<
  GetTagQuery,
  TagResponseDto
> {
  constructor(
    @Inject(TAG_READ_DAO_TOKEN)
    private readonly tagReadDao: ITagReadDao,
  ) {}

  async execute(query: GetTagQuery): Promise<TagResponseDto> {
    const { id, tenantId } = query;

    const tag = await this.tagReadDao.findById(id, tenantId);

    if (!tag) {
      throw new NotFoundException('Tag', id);
    }

    return tag;
  }
}
