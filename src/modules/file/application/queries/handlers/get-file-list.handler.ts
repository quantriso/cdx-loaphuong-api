import { Injectable, Inject } from '@nestjs/common';
import { QueryHandler } from '@nestjs/cqrs';
import { IQueryHandler } from '@core/application';
import { GetFileListQuery } from '../../queries/get-file-list.query';
import type { IFileReadDaoPort } from '../../queries/ports/file-read-dao.interface';
import { FileTokens } from '../../../constants';

/**
 * Get File List Query Handler
 *
 * Retrieves a paginated list of files with filtering and sorting using Read DAO (CQRS pattern)
 *
 * Business Rules:
 * - Only return files belonging to the tenant
 * - Support filtering by file type, mime type, etc.
 * - Support pagination
 * - Support sorting by various fields
 */
@QueryHandler(GetFileListQuery)
@Injectable()
export class GetFileListHandler implements IQueryHandler<
  GetFileListQuery,
  any
> {
  constructor(
    @Inject(FileTokens.FILE_READ_DAO)
    private readonly fileReadDao: IFileReadDaoPort,
  ) {}

  async execute(query: GetFileListQuery): Promise<any> {
    const offset = (query.page - 1) * query.limit;

    // Get total count
    const total = await this.fileReadDao.count({
      tenantId: query.tenantId,
      fileType: query.fileType,
      uploadedBy: query.uploadedBy,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    });

    // Get paginated data
    const data = await this.fileReadDao.findList({
      tenantId: query.tenantId,
      fileType: query.fileType,
      uploadedBy: query.uploadedBy,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      limit: query.limit,
      offset,
      sortBy: query.sortBy || 'createdAt',
      sortOrder: query.sortOrder || 'DESC',
    });

    return {
      data,
      total,
      page: query.page,
      limit: query.limit,
    };
  }
}
