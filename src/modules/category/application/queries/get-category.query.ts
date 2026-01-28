import { IQuery } from '@core/application';
import type { CategoryResponseDto } from '../dtos/category-response.dto';

/**
 * Get Category Query
 *
 * Story 4.1: Manage Categories
 */
export class GetCategoryQuery extends IQuery<CategoryResponseDto> {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
  ) {
    super();
  }
}
