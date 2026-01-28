import type { IQueryHandler } from '@core/application';
import { QueryHandler } from '@shared/cqrs';
import { Inject } from '@nestjs/common';
import { ListCategoriesQuery } from '../list-categories.query';
import type { ListCategoriesResponseDto } from '../../dtos/list-categories-response.dto';
import type { ICategoryReadDao } from '../ports';
import { CATEGORY_READ_DAO_TOKEN } from '../../../constants/tokens';

/**
 * List Categories Query Handler
 *
 * Story 4.1: Manage Categories
 *
 * CQRS Pattern:
 * - Query handler (read side)
 * - Supports pagination and filtering
 * - Uses read DAO for optimized queries
 */
@QueryHandler(ListCategoriesQuery)
export class ListCategoriesHandler implements IQueryHandler<
  ListCategoriesQuery,
  ListCategoriesResponseDto
> {
  constructor(
    @Inject(CATEGORY_READ_DAO_TOKEN)
    private readonly categoryReadDao: ICategoryReadDao,
  ) {}

  async execute(
    query: ListCategoriesQuery,
  ): Promise<ListCategoriesResponseDto> {
    const { tenantId, isActive, parentId, page, limit } = query;

    const result = await this.categoryReadDao.findAll(
      tenantId,
      isActive,
      parentId,
      page,
      limit,
    );

    return {
      data: result.data,
      total: result.total,
      page,
      limit,
    };
  }
}
