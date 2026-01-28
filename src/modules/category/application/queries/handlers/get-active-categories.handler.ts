import type { IQueryHandler } from '@core/application';
import { QueryHandler } from '@shared/cqrs';
import { Inject } from '@nestjs/common';
import { GetActiveCategoriesQuery } from '../get-active-categories.query';
import type { CategoryResponseDto } from '../../dtos/category-response.dto';
import type { ICategoryReadDao } from '../ports';
import { CATEGORY_READ_DAO_TOKEN } from '../../../constants/tokens';

/**
 * Get Active Categories Query Handler
 *
 * Story 4.1: Manage Categories
 *
 * Returns only active categories for use in content creation UI.
 *
 * CQRS Pattern:
 * - Query handler (read side)
 * - Optimized for UI dropdowns
 * - Cacheable result
 */
@QueryHandler(GetActiveCategoriesQuery)
export class GetActiveCategoriesHandler implements IQueryHandler<
  GetActiveCategoriesQuery,
  CategoryResponseDto[]
> {
  constructor(
    @Inject(CATEGORY_READ_DAO_TOKEN)
    private readonly categoryReadDao: ICategoryReadDao,
  ) {}

  async execute(
    query: GetActiveCategoriesQuery,
  ): Promise<CategoryResponseDto[]> {
    const { tenantId } = query;

    return this.categoryReadDao.findActive(tenantId);
  }
}
