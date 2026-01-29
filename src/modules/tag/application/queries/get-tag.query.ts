import { IQuery } from '@core/application';
import type { TagResponseDto } from '../dtos/tag-response.dto';

/**
 * Get Tag Query
 *
 * Story 4.3: Create, Edit, Delete Tags
 */
export class GetTagQuery extends IQuery<TagResponseDto> {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
  ) {
    super();
  }
}
