import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import { CommandHandler } from '@nestjs/cqrs';
import { ICommandHandler } from 'src/libs/core/application';
import { REQUEST_CONTEXT_TOKEN } from 'src/libs/core/constants';
import { EVENT_BUS_TOKEN } from 'src/libs/shared';
import type { IRequestContextProvider } from 'src/libs/core/common';
import type { IEventBus } from 'src/libs/core/infrastructure';
import { GetDownloadUrlCommand } from '../get-download-url.command';
import type { IFileRepository } from '../../../domain/repositories/file.repository.interface';
import type { IStorageService } from '../../../infrastructure/services/storage.interface';
import { FileTokens } from '../../../constants';
import { FileId } from '../../../domain';
import { FileNotFoundException } from '../../../domain/exceptions';
import { FileDownloadedEvent } from '../../../domain/events';
import { DownloadUrlResponseDto } from '../../dtos/file.dto';

/**
 * Get Download URL Command Handler
 *
 * Story 5.4: Download File
 *
 * Business Rules:
 * - File must exist in database
 * - File must belong to the specified tenant
 * - Presigned URL is generated for secure access
 * - URL expires after configured time (default: 1 hour)
 * - FileDownloadedEvent is emitted for auditing
 * - Supports downloading original, processed, or thumbnail versions
 *
 * Implementation:
 * 1. Retrieve file from repository by ID
 * 2. Verify file belongs to tenant
 * 3. Determine which version to download (original/processed/thumbnail)
 * 4. Generate presigned URL from storage service
 * 5. Emit FileDownloadedEvent
 * 6. Return response DTO with download URL and metadata
 */
@CommandHandler(GetDownloadUrlCommand)
@Injectable()
export class GetDownloadUrlHandler implements ICommandHandler<
  GetDownloadUrlCommand,
  DownloadUrlResponseDto
> {
  private readonly logger = new Logger(GetDownloadUrlHandler.name);
  private readonly PRESIGNED_URL_EXPIRY_SECONDS = 900; // 15 minutes (AC requirement)

  constructor(
    @Inject(FileTokens.FILE_REPOSITORY)
    private readonly fileRepository: IFileRepository,
    @Inject(FileTokens.FILE_STORAGE)
    private readonly storageService: IStorageService,
    @Inject(EVENT_BUS_TOKEN)
    private readonly eventBus: IEventBus,
    @Optional()
    @Inject(REQUEST_CONTEXT_TOKEN)
    private readonly requestContext?: IRequestContextProvider,
  ) {}

  async execute(
    command: GetDownloadUrlCommand,
  ): Promise<DownloadUrlResponseDto> {
    // 0. Get request context for distributed tracing
    const context = this.requestContext?.current();
    const eventMetadata = context
      ? {
          correlationId: context.correlationId,
          causationId: context.causationId,
          userId: context.userId,
        }
      : undefined;

    // 1. Retrieve file from repository by ID
    const fileId = new FileId(command.fileId);
    const file = await this.fileRepository.findById(fileId);

    if (!file) {
      throw new FileNotFoundException(command.fileId);
    }

    // 2. Verify file belongs to tenant
    if (file.tenantId !== command.tenantId) {
      throw new FileNotFoundException(command.fileId);
    }

    // 3. Determine which version to download
    let storagePath: string;
    let fileName: string;

    switch (command.version) {
      case 'processed':
        if (!file.processedPath) {
          // If processed version doesn't exist, fall back to original
          storagePath = file.storagePath;
          fileName = file.originalFileName;
        } else {
          storagePath = file.processedPath;
          fileName = file.originalFileName;
        }
        break;
      case 'thumbnail':
        if (!file.thumbnailPath) {
          // If thumbnail doesn't exist, fall back to original
          storagePath = file.storagePath;
          fileName = file.originalFileName;
        } else {
          storagePath = file.thumbnailPath;
          // Thumbnails typically have different naming convention
          const ext = file.originalFileName.split('.').pop() || '';
          fileName = `thumbnail_${file.originalFileName.replace(
            `.${ext}`,
            '',
          )}.${ext}`;
        }
        break;
      case 'original':
      default:
        storagePath = file.storagePath;
        fileName = file.originalFileName;
        break;
    }

    // 4. Generate presigned URL from storage service
    const downloadUrl = await this.storageService.generatePresignedUrl(
      storagePath,
      this.PRESIGNED_URL_EXPIRY_SECONDS,
    );

    // 5. Publish FileDownloadedEvent for auditing
    const downloadedEvent = new FileDownloadedEvent(
      file.id,
      {
        tenantId: file.tenantId,
        originalFileName: file.originalFileName,
        mimeType: file.mimeType,
        fileSize: file.fileSize,
        fileType: file.fileType.value,
        userId: command.userId,
        contentId: command.contentId,
      },
      eventMetadata,
    );

    await this.eventBus.publish(downloadedEvent);
    this.logger.log(`Published FileDownloadedEvent for file ${file.id}`);

    // 6. Calculate expiration time
    const expiresAt = new Date();
    expiresAt.setSeconds(
      expiresAt.getSeconds() + this.PRESIGNED_URL_EXPIRY_SECONDS,
    );

    // 7. Return response DTO
    return {
      downloadUrl,
      fileName,
      mimeType: file.mimeType,
      fileSize: file.fileSize,
      expiresAt,
    };
  }
}
