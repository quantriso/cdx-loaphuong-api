import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { CommandHandler } from '@nestjs/cqrs';
import { ICommandHandler } from '@core/application';
import { ProcessFileCommand } from '../process-file.command';
import type { IFileRepository } from '../../../domain/repositories/file.repository.interface';
import type { IStorageService } from '../../../infrastructure/services/storage.interface';
import { ImageProcessingService } from '../../../infrastructure/services/image-processing.service';
import { FileTokens } from '../../../constants';
import { File, FileId } from '../../../domain';
import { FileDto } from '../../dtos/file.dto';
import type { ImageProcessingOptions } from '../process-file.command';

/**
 * Process File Command Handler
 *
 * Story 5.3: Process Uploaded Images
 *
 * Business Rules:
 * - File must exist and belong to the tenant
 * - Only IMAGE files can be processed
 * - File must have been uploaded successfully
 * - Processing includes:
 *   - Resizing to max width 2000px (maintaining aspect ratio)
 *   - Compressing to 80% quality
 *   - Converting to WebP format
 *   - Generating thumbnail at 300x300px (center crop)
 *   - Storing original, processed, and thumbnail files
 * - FileProcessedEvent is emitted
 * - Processing completes within 5 seconds for 10MB image
 * - Processing failures are logged and retried once
 *
 * Implementation:
 * 1. Validate file exists and belongs to tenant
 * 2. Validate file type is IMAGE
 * 3. Retrieve original file from storage
 * 4. Process image using ImageProcessingService
 * 5. Store processed and thumbnail variants in storage
 * 6. Update file entity with processed paths and metadata
 * 7. Save to repository (emits FileProcessedEvent)
 * 8. Return updated file DTO
 */
@CommandHandler(ProcessFileCommand)
@Injectable()
export class ProcessFileHandler implements ICommandHandler<
  ProcessFileCommand,
  FileDto
> {
  private readonly logger = new Logger(ProcessFileHandler.name);

  constructor(
    @Inject(FileTokens.FILE_REPOSITORY)
    private readonly fileRepository: IFileRepository,
    @Inject(FileTokens.FILE_STORAGE)
    private readonly storageService: IStorageService,
    private readonly imageProcessingService: ImageProcessingService,
  ) {}

  async execute(command: ProcessFileCommand): Promise<FileDto> {
    const startTime = Date.now();
    const fileId = new FileId(command.fileId);

    this.logger.log(
      `Starting file processing: ${command.fileId} for tenant ${command.tenantId}`,
    );

    // 1. Retrieve file
    const file = await this.fileRepository.findById(fileId);

    if (!file) {
      throw new NotFoundException('File not found');
    }

    if (file.tenantId !== command.tenantId) {
      throw new NotFoundException('File not found');
    }

    // 2. Validate file type is IMAGE
    if (!file.fileType.isImage()) {
      throw new BadRequestException('Only image files can be processed');
    }

    // 3. Retrieve original file from storage
    let originalBuffer: Buffer;
    try {
      originalBuffer = await this.storageService.getFile(file.storagePath);
      this.logger.debug(
        `Retrieved original file: ${file.storagePath} (${originalBuffer.length} bytes)`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to retrieve original file: ${file.storagePath}`,
        error,
      );
      throw new BadRequestException('Original file not found in storage');
    }

    // 4. Process image using ImageProcessingService
    let processingResult;
    try {
      processingResult = await this.imageProcessingService.processImage(
        originalBuffer,
        command.options,
      );
      this.logger.debug(
        `Image processed: ${processingResult.metadata.width}x${processingResult.metadata.height}, ` +
          `processed: ${processingResult.processedBuffer.length} bytes, ` +
          `thumbnail: ${processingResult.thumbnailBuffer.length} bytes, ` +
          `time: ${processingResult.processingTime}ms`,
      );
    } catch (error) {
      this.logger.error(
        `Image processing failed for file ${command.fileId}`,
        error,
      );
      throw new BadRequestException('Image processing failed');
    }

    // 5. Store processed and thumbnail variants in storage
    // Generate filenames based on storage key
    const baseFileName = file.storagePath.split('/').pop() || '';
    const storageKey = baseFileName.substring(0, baseFileName.lastIndexOf('.'));

    const processedFileName = `processed/${storageKey}.webp`;
    const thumbnailFileName = `thumbnails/${storageKey}_thumb.webp`;

    let processedPath: string;
    let thumbnailPath: string;

    try {
      processedPath = await this.storageService.saveFile(
        file.tenantId,
        processingResult.processedBuffer,
        processedFileName,
      );
      this.logger.debug(`Saved processed file: ${processedPath}`);

      thumbnailPath = await this.storageService.saveFile(
        file.tenantId,
        processingResult.thumbnailBuffer,
        thumbnailFileName,
      );
      this.logger.debug(`Saved thumbnail: ${thumbnailPath}`);
    } catch (error) {
      this.logger.error(
        `Failed to save processed files for ${command.fileId}`,
        error,
      );
      throw new BadRequestException('Failed to save processed files');
    }

    // 6. Generate processing metadata
    const metadata: Record<string, any> = {
      processedAt: new Date().toISOString(),
      processingTime: processingResult.processingTime,
      originalSize: file.fileSize,
      processedSize: processingResult.metadata.size,
      thumbnailSize: processingResult.thumbnailBuffer.length,
      width: processingResult.metadata.width,
      height: processingResult.metadata.height,
      size: processingResult.metadata.size,
      format: processingResult.metadata.format,
      originalFormat: processingResult.metadata.originalFormat,
      dimensions: {
        original: {
          width: processingResult.metadata.width,
          height: processingResult.metadata.height,
        },
      },
      options: command.options || {},
    };

    // 7. Update file entity with processed paths and metadata
    file.markAsProcessed(processedPath, thumbnailPath, metadata);

    // 8. Save to repository (emits FileProcessedEvent)
    await this.fileRepository.save(file);

    const totalTime = Date.now() - startTime;
    this.logger.log(
      `File processing completed: ${command.fileId} in ${totalTime}ms`,
    );

    // 9. Return DTO with message
    const dto = this.toDto(file);
    return {
      ...dto,
      message: 'File processed successfully',
    } as FileDto & { message: string };
  }

  private toDto(file: File): FileDto {
    return {
      id: file.id,
      tenantId: file.tenantId,
      originalFileName: file.originalFileName,
      mimeType: file.mimeType,
      fileSize: file.fileSize,
      fileType: file.fileType.toString(),
      storagePath: file.storagePath,
      storageProvider: file.storageProvider,
      processedPath: file.processedPath,
      thumbnailPath: file.thumbnailPath,
      processedMetadata: file.processedMetadata,
      uploadedBy: file.uploadedBy,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    };
  }
}
