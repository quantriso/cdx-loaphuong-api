import { Injectable, Logger } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { FILE_SERVICE_TOKEN } from '../constants/tokens';
import type {
  FileDownloadDto,
  FileDto,
  FileProcessDto,
  FileSearchDto,
  FileUploadDto,
  FileUploadResponseDto,
} from './dtos/file.dto';
import {
  UploadFileCommand,
  ProcessFileCommand,
  DeleteFileCommand,
  DownloadFileCommand,
} from './commands';
import { GetFileQuery, GetFileListQuery } from './queries';

/**
 * File Service
 *
 * Application Service facade for the File module.
 * Orchestrates Command/Query handlers using CQRS pattern.
 *
 * ## Architecture
 *
 * - **Pattern**: Facade pattern - delegates to CQRS handlers
 * - **Responsibility**: Provides high-level API for file operations
 *
 * ## Responsibilities
 *
 * - Upload files to storage and persist metadata
 * - Process images (resize, create thumbnails)
 * - Get file metadata
 * - Download files from storage
 * - Delete files from storage and database
 */
@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  /**
   * Upload a file to storage and persist metadata
   *
   * Delegates to UploadFileCommandHandler via CommandBus.
   * Emits FileUploadedEvent upon success.
   */
  async uploadFile(dto: FileUploadDto): Promise<FileUploadResponseDto> {
    this.logger.log(`Uploading file: ${dto.file.originalname}`);

    const command = new UploadFileCommand(
      dto.file,
      dto.tenantId,
      dto.uploadedBy,
      dto.storageKey,
    );
    return this.commandBus.execute(command);
  }

  /**
   * Process an uploaded image (resize, create thumbnail, etc.)
   *
   * Delegates to ProcessFileCommandHandler via CommandBus.
   * Only works for IMAGE type files.
   * Emits FileProcessedEvent upon success.
   */
  async processFile(dto: FileProcessDto): Promise<FileDto> {
    this.logger.log(`Processing file: ${dto.fileId}`);

    const command = new ProcessFileCommand(
      dto.fileId,
      dto.processedBy || dto.tenantId,
      dto.tenantId,
      dto.options,
    );
    return this.commandBus.execute(command);
  }

  /**
   * Get a single file by ID
   *
   * Delegates to GetFileQueryHandler via QueryBus.
   */
  async getFile(dto: { fileId: string; tenantId: string }): Promise<FileDto> {
    this.logger.debug(`Getting file: ${dto.fileId}`);

    const query = new GetFileQuery(dto.fileId, dto.tenantId);
    return this.queryBus.execute(query);
  }

  /**
   * Get list of files with pagination and filtering
   *
   * Delegates to GetFileListQueryHandler via QueryBus.
   */
  async getFileList(dto: {
    tenantId: string;
    page: number;
    limit: number;
    fileType?: string;
    uploadedBy?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy: string;
    sortOrder: string;
  }): Promise<FileSearchDto> {
    this.logger.debug(
      `Getting file list for tenant ${dto.tenantId}, page ${dto.page}`,
    );

    const query = new GetFileListQuery(
      dto.tenantId,
      dto.page,
      dto.limit,
      dto.fileType,
      dto.uploadedBy,
      dto.dateFrom,
      dto.dateTo,
      dto.sortBy,
      dto.sortOrder,
    );

    return this.queryBus.execute(query);
  }

  /**
   * Download a file from storage
   *
   * Delegates to DownloadFileCommandHandler via CommandBus.
   * Supports downloading different versions: original, processed, thumbnail.
   */
  async downloadFile(dto: FileDownloadDto): Promise<{
    fileBuffer: Buffer;
    mimeType: string;
    fileName: string;
  }> {
    this.logger.log(`Downloading file: ${dto.fileId}, version: ${dto.version}`);

    const command = new DownloadFileCommand(dto.fileId, dto.tenantId);
    return this.commandBus.execute(command);
  }

  /**
   * Delete a file from storage and mark as deleted
   *
   * Delegates to DeleteFileCommandHandler via CommandBus.
   * Emits FileDeletedEvent upon success.
   */
  async deleteFile(dto: { fileId: string; tenantId: string }): Promise<void> {
    this.logger.log(`Deleting file: ${dto.fileId}`);

    const command = new DeleteFileCommand(
      dto.fileId,
      dto.tenantId,
      dto.tenantId, // Use tenantId as deletedBy for now
    );

    await this.commandBus.execute(command);
  }
}

/**
 * Provider for FileService
 */
export const FileServiceProvider = {
  provide: FILE_SERVICE_TOKEN,
  useClass: FileService,
};
