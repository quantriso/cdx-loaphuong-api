import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { QueryHandler } from '@nestjs/cqrs';
import { IQueryHandler } from '@core/application';
import { DownloadFileQuery } from '../../queries/download-file.query';
import type { IFileReadDaoPort } from '../../queries/ports/file-read-dao.interface';
import { FileTokens } from '../../../constants';
import { FileDto } from '../../dtos/file.dto';

/**
 * Download File Query Handler
 *
 * Story 5.4: Download File
 *
 * Business Rules:
 * - File must exist and belong to the tenant
 * - Return file URL or stream for download
 * - Optionally return processed version if available
 *
 * Implementation:
 * 1. Validate file exists and belongs to tenant
 * 2. Return file URL or stream
 */
@QueryHandler(DownloadFileQuery)
@Injectable()
export class DownloadFileHandler implements IQueryHandler<
  DownloadFileQuery,
  { url: string; mimeType: string; fileName: string }
> {
  constructor(
    @Inject(FileTokens.FILE_READ_DAO)
    private readonly fileReadDao: IFileReadDaoPort,
  ) {}

  async execute(
    query: DownloadFileQuery,
  ): Promise<{ url: string; mimeType: string; fileName: string }> {
    // 1. Retrieve file using Read DAO
    const file = await this.fileReadDao.findById(query.fileId, query.tenantId);

    if (!file) {
      throw new NotFoundException('File not found');
    }

    // 2. Determine which URL to return
    let url: string;
    if (query.version === 'processed' && file.processedPath) {
      url = file.processedPath;
    } else if (query.version === 'thumbnail' && file.thumbnailPath) {
      url = file.thumbnailPath;
    } else {
      url = file.storagePath;
    }

    // 3. Return file info
    return {
      url,
      mimeType: file.mimeType,
      fileName: file.originalFileName,
    };
  }
}
