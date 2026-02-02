import { IQuery } from '@core/application';
import { PaginatedResponseDto } from 'src/libs/shared/http/dtos/pagination.dto';
import { FileDto } from '../dtos/file.dto';

/**
 * Get File List Query
 *
 * Story 5.1: Upload File
 * Story 5.4: Download File
 *
 * Query to retrieve filtered and paginated list of files.
 * Supports filtering by file type, uploader, date range.
 * Supports sorting by various fields.
 */
export class GetFileListQuery extends IQuery<PaginatedResponseDto<FileDto>> {
  constructor(
    public readonly tenantId: string,
    public readonly page: number = 1,
    public readonly limit: number = 20,
    public readonly fileType?: string,
    public readonly uploadedBy?: string,
    public readonly dateFrom?: string,
    public readonly dateTo?: string,
    public readonly sortBy: string = 'createdAt',
    public readonly sortOrder: string = 'desc',
  ) {
    super();
    if (!tenantId || tenantId.trim().length === 0) {
      throw new Error('Tenant ID is required');
    }
  }
}
