import { IQuery } from '@core/application';
import type { TagResponseDto } from '../dtos/tag-response.dto';

/**
 * List Tags Query
 *
 * Story 4.3: Create, Edit, Delete Tags
 */
export class ListTagsQuery extends IQuery<{
  data: TagResponseDto[];
  total: number;
}> {
  constructor(
    public readonly tenantId: string,
    public readonly isActive?: boolean,
    public readonly page: number = 1,
    public readonly limit: number = 50,
  ) {
    super();
  }
}
