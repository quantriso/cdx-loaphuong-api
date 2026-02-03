import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { CommandHandler } from '@nestjs/cqrs';
import { ICommandHandler } from '@core/application';
import { UploadFileCommand } from '../upload-file.command';
import type { IFileRepository } from '../../../domain/repositories/file.repository.interface';
import type { IStorageService } from '../../../infrastructure/services/storage.interface';
import { FileTokens } from '../../../constants';
import { File, FileId } from '../../../domain';
import {
  FileType,
  FileTypeEnum,
} from '../../../domain/value-objects/file-type.value-object';
import { FileDto, FileUploadResponseDto } from '../../dtos/file.dto';
import {
  FileValidationService,
  FileValidationContext,
} from '../../../domain/services/file-validation.service';

/**
 * Upload File Command Handler
 *
 * Story 5.1: Upload File
 * Story 5.2: Validate File Upload
 *
 * Business Rules:
 * - File must be valid (not empty, correct MIME type)
 * - File size must be within limits (configured in environment)
 * - Only allowed MIME types are accepted
 * - File extension must match MIME type
 * - File must not contain malicious content
 * - File is stored in storage service (S3, local, etc.)
 * - File metadata is saved to database
 * - FileUploadedEvent is emitted
 *
 * Implementation:
 * 1. Validate file using FileValidationService (comprehensive validation)
 * 2. Generate unique file ID and storage key
 * 3. Store file in storage service
 * 4. Create File entity with metadata
 * 5. Save to repository (emits FileUploadedEvent)
 */
@CommandHandler(UploadFileCommand)
@Injectable()
export class UploadFileHandler implements ICommandHandler<
  UploadFileCommand,
  FileUploadResponseDto
> {
  constructor(
    @Inject(FileTokens.FILE_REPOSITORY)
    private readonly fileRepository: IFileRepository,
    @Inject(FileTokens.FILE_VALIDATION_SERVICE)
    private readonly fileValidationService: FileValidationService,
    @Inject(FileTokens.FILE_STORAGE)
    private readonly storageService: IStorageService,
  ) {}

  async execute(command: UploadFileCommand): Promise<FileUploadResponseDto> {
    // 1. Validate file using FileValidationService (comprehensive validation)
    // Story 5.2: Validate File Upload
    const validationContext: FileValidationContext = {
      tenantId: command.tenantId,
      fileName: command.file.originalname,
      mimeType: command.file.mimetype,
      fileSize: command.file.size,
      fileBuffer: command.file.buffer,
    };

    const validationOptions = {
      maxFileSize: 50 * 1024 * 1024, // 50MB
      checkDuplicate: false, // Don't check duplicates on initial upload
      checkExtension: true, // Validate extension matches MIME type
      scanForMalicious: true, // Scan for malicious content
    };

    await this.fileValidationService.validateFile(
      validationContext,
      validationOptions,
    );

    // 2. Generate unique file ID
    const fileId = FileId.generate();
    const ext = command.file.originalname.split('.').pop() || '';

    // 3. Determine file type
    const fileType = this.determineFileType(command.file.mimetype);

    // 4. Save file to storage
    const fileName = `${fileId.value}.${ext}`;
    const storagePath = await this.storageService.saveFile(
      command.tenantId,
      command.file.buffer,
      fileName,
    );
    console.log('[UPLOAD HANDLER] File saved to storage:', storagePath);

    // 5. Create File entity
    const file = File.createNew(
      command.tenantId,
      command.file.originalname,
      command.file.mimetype,
      command.file.size,
      fileType,
      storagePath,
      command.uploadedBy,
      'local',
    );

    // 6. Save to repository (emits FileUploadedEvent)
    console.log('[UPLOAD HANDLER] About to save file to repository:', {
      id: file.id,
      version: file.version,
      tenantId: file.tenantId,
      originalFileName: file.originalFileName,
      storagePath: file.storagePath,
    });
    await this.fileRepository.save(file);
    console.log('[UPLOAD HANDLER] File saved successfully to repository');

    // 7. Return response DTO
    return this.toUploadResponseDto(file);
  }

  private generateStoragePath(
    tenantId: string,
    fileId: string,
    originalName: string,
  ): string {
    const ext = originalName.split('.').pop() || '';
    return `${tenantId}/${fileId}.${ext}`;
  }

  private determineFileType(mimeType: string): FileType {
    if (mimeType.startsWith('image/')) {
      return FileType.fromValue(FileTypeEnum.IMAGE);
    }
    if (mimeType.startsWith('video/')) {
      return FileType.fromValue(FileTypeEnum.VIDEO);
    }
    if (mimeType.startsWith('audio/')) {
      return FileType.fromValue(FileTypeEnum.AUDIO);
    }
    if (
      mimeType === 'application/pdf' ||
      mimeType.includes('word') ||
      mimeType.includes('document') ||
      mimeType.includes('excel') ||
      mimeType.includes('spreadsheet')
    ) {
      return FileType.fromValue(FileTypeEnum.DOCUMENT);
    }
    if (
      mimeType === 'application/zip' ||
      mimeType === 'application/x-zip-compressed' ||
      mimeType === 'application/x-rar-compressed' ||
      mimeType === 'application/x-7z-compressed' ||
      mimeType === 'application/x-tar' ||
      mimeType === 'application/gzip'
    ) {
      return FileType.fromValue(FileTypeEnum.ARCHIVE);
    }

    // Default to OTHER for other supported MIME types
    return FileType.fromValue(FileTypeEnum.OTHER);
  }

  private toUploadResponseDto(file: File): FileUploadResponseDto {
    return {
      id: file.id,
      message: 'File uploaded successfully',
      fileName: file.originalFileName,
      originalFileName: file.originalFileName,
      mimeType: file.mimeType,
      fileSize: file.fileSize,
      fileType: file.fileType.toString(),
      storagePath: file.storagePath,
      createdAt: file.createdAt,
    };
  }

  private toDto(file: File): FileDto {
    return {
      id: file.id,
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
      tenantId: file.tenantId,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    };
  }
}
