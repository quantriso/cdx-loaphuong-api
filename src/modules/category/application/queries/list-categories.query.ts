import { IQuery } from '@core/application';
import type { ListCategoriesResponseDto } from '../dtos/list-categories-response.dto';

/**
 * List Categories Query
 *
 * Story 4.1: Manage Categories
 */
export class ListCategoriesQuery extends IQuery<ListCategoriesResponseDto> {
  constructor(
    public readonly tenantId: string,
    public readonly isActive?: boolean,
    public readonly parentId?: string | null,
    public readonly page: number = 1,
    public readonly limit: number = 50,
  ) {
    super();
  }
}
