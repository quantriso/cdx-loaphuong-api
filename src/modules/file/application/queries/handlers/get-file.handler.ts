import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { QueryHandler } from '@nestjs/cqrs';
import { IQueryHandler } from '@core/application';
import { GetFileQuery } from '../../queries/get-file.query';
import type { IFileReadDaoPort } from '../../queries/ports/file-read-dao.interface';
import { FileTokens } from '../../../constants';
import { FileDto } from '../../dtos/file.dto';

/**
 * Get File Query Handler
 *
 * Retrieves a single file by ID using Read DAO (CQRS pattern)
 *
 * Business Rules:
 * - File must exist and belong to the tenant
 * - Return file details as DTO
 */
@QueryHandler(GetFileQuery)
@Injectable()
export class GetFileHandler implements IQueryHandler<GetFileQuery, FileDto> {
  constructor(
    @Inject(FileTokens.FILE_READ_DAO)
    private readonly fileReadDao: IFileReadDaoPort,
  ) {}

  async execute(query: GetFileQuery): Promise<FileDto> {
    const file = await this.fileReadDao.findById(query.fileId, query.tenantId);

    if (!file) {
      throw new NotFoundException('File not found');
    }

    return file;
  }
}
