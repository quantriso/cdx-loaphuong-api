import { IQuery } from '@core/application';
import { ContentResponseDto } from '../dtos';

/**
 * Get Content Query
 *
 * Story 3.1: Create Content Draft - Read Side
 * Query to retrieve content by ID
 */
export class GetContentQuery extends IQuery<ContentResponseDto> {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
  ) {
    super();
  }
}
