import { IQuery } from '@core/application';
import type { CategoryResponseDto } from '../dtos/category-response.dto';

/**
 * Get Active Categories Query
 *
 * Story 4.1: Manage Categories
 *
 * Returns only active categories for use in content creation UI.
 */
export class GetActiveCategoriesQuery extends IQuery<CategoryResponseDto[]> {
  constructor(public readonly tenantId: string) {
    super();
  }
}
