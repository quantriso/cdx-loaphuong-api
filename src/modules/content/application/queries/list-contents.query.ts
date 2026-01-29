import { IQuery } from 'src/libs/core/application';
import { PaginatedResponseDto } from 'src/libs/shared/http/dtos/pagination.dto';
import { ContentResponseDto } from '../dtos';

/**
 * List Contents Query
 *
 * Story 4.5: Filter Content by Category & Tags
 *
 * Query to retrieve filtered and paginated list of contents.
 * Supports filtering by category, tags, date range, type, author, and status.
 * Supports sorting by various fields.
 */
export class ListContentsQuery extends IQuery<PaginatedResponseDto<ContentResponseDto>> {
  constructor(
    public readonly tenantId: string,
    public readonly page: number = 1,
    public readonly limit: number = 20,
    public readonly category?: string,
    public readonly tags?: string[],
    public readonly dateFrom?: string,
    public readonly dateTo?: string,
    public readonly type?: string,
    public readonly authorId?: string,
    public readonly status?: string[],
    public readonly sortBy: string = 'createdAt',
    public readonly sortOrder: string = 'desc',
  ) {
    super();
  }
}
