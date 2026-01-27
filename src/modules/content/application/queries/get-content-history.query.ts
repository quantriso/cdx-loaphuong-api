import { IQuery } from '@core/application';
import { GetContentHistoryResponseDto } from '../dtos';

/**
 * Get Content History Query
 *
 * Story 3.9: View Content History
 *
 * Retrieves the complete history of content changes.
 * Includes all modifications, status changes, and actions performed.
 */
export class GetContentHistoryQuery extends IQuery<GetContentHistoryResponseDto> {
  constructor(
    public readonly contentId: string,
    public readonly tenantId: string,
    public readonly limit: number = 50,
  ) {
    super();
  }
}
