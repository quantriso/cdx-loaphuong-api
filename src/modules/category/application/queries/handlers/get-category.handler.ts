import type { IQueryHandler } from '@core/application';
import { QueryHandler } from '@shared/cqrs';
import { Inject } from '@nestjs/common';
import { NotFoundException } from '@core/common';
import { GetCategoryQuery } from '../get-category.query';
import type { CategoryResponseDto } from '../../dtos/category-response.dto';
import type { ICategoryReadDao } from '../ports';
import { CATEGORY_READ_DAO_TOKEN } from '../../../constants/tokens';

/**
 * Get Category Query Handler
 *
 * Story 4.1: Manage Categories
 *
 * CQRS Pattern:
 * - Query handler (read side)
 * - Uses read DAO for optimized queries
 * - Returns DTO (not domain entity)
 */
@QueryHandler(GetCategoryQuery)
export class GetCategoryHandler implements IQueryHandler<
  GetCategoryQuery,
  CategoryResponseDto
> {
  constructor(
    @Inject(CATEGORY_READ_DAO_TOKEN)
    private readonly categoryReadDao: ICategoryReadDao,
  ) {}

  async execute(query: GetCategoryQuery): Promise<CategoryResponseDto> {
    const { id, tenantId } = query;

    const category = await this.categoryReadDao.findById(id, tenantId);

    if (!category) {
      throw new NotFoundException('Category', id);
    }

    return category;
  }
}
