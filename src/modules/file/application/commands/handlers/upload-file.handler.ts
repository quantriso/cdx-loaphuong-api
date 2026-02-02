import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { CommandHandler } from '@nestjs/cqrs';
import { ICommandHandler } from '@core/application';
import { UploadFileCommand } from '../upload-file.command';
import type { IFileRepository } from '../../../domain/repositories/file.repository.interface';
import { FileTokens } from '../../../constants';
import { File, FileId } from '../../../domain';
import {
  FileType,
  FileTypeEnum,
} from '../../../domain/value-objects/file-type.value-object';
import { FileDto, FileUploadResponseDto } from '../../dtos/file.dto';

/**
 * Upload File Command Handler
 *
 * Story 5.1: Upload File
 *
 * Business Rules:
 * - File must be valid (not empty, correct MIME type)
 * - File size must be within limits (configured in environment)
 * - Only allowed MIME types are accepted
 * - File is stored in storage service (S3, local, etc.)
 * - File metadata is saved to database
 * - FileUploadedEvent is emitted
 *
 * Implementation:
 * 1. Validate file properties (size, MIME type)
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
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB (sync with Fastify limit)
  private readonly ALLOWED_MIME_TYPES = [
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    // Videos
    'video/mp4',
    'video/webm',
    'video/quicktime',
    // Audio
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    // Archives
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/x-tar',
    'application/gzip',
    // Other
    'text/plain',
    'text/csv',
    'application/json',
    'application/xml',
  ];

  private readonly ALLOWED_EXTENSIONS = {
    image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
    document: ['pdf', 'doc', 'docx', 'xls', 'xlsx'],
    video: ['mp4', 'webm', 'mov'],
    audio: ['mp3', 'wav', 'ogg'],
    archive: ['zip', 'rar', '7z', 'tar', 'gz'],
  };

  constructor(
    @Inject(FileTokens.FILE_REPOSITORY)
    private readonly fileRepository: IFileRepository,
  ) {}

  async execute(command: UploadFileCommand): Promise<FileUploadResponseDto> {
    // 1. Validate file size
    if (command.file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds maximum limit of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }

    // 2. Validate MIME type
    if (!this.ALLOWED_MIME_TYPES.includes(command.file.mimetype)) {
      throw new BadRequestException(
        `File type ${command.file.mimetype} is not allowed`,
      );
    }

    // 3. Validate file extension
    this.validateFileExtension(
      command.file.mimetype,
      command.file.originalname,
    );

    // 3. Generate unique file ID and storage key
    const fileId = FileId.generate();
    const storagePath = this.generateStoragePath(
      command.tenantId,
      fileId.value,
      command.file.originalname,
    );

    // 4. Determine file type
    const fileType = this.determineFileType(command.file.mimetype);

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

  private validateFileExtension(mimeType: string, filename: string): void {
    const ext = filename.split('.').pop()?.toLowerCase();

    if (!ext) {
      throw new BadRequestException('File must have an extension');
    }

    let allowedExtensions: string[] = [];

    if (mimeType.startsWith('image/')) {
      allowedExtensions = this.ALLOWED_EXTENSIONS.image;
    } else if (mimeType.startsWith('video/')) {
      allowedExtensions = this.ALLOWED_EXTENSIONS.video;
    } else if (mimeType.startsWith('audio/')) {
      allowedExtensions = this.ALLOWED_EXTENSIONS.audio;
    } else if (
      mimeType === 'application/pdf' ||
      mimeType.includes('word') ||
      mimeType.includes('document') ||
      mimeType.includes('excel') ||
      mimeType.includes('spreadsheet')
    ) {
      allowedExtensions = this.ALLOWED_EXTENSIONS.document;
    } else if (
      mimeType === 'application/zip' ||
      mimeType === 'application/x-zip-compressed' ||
      mimeType === 'application/x-rar-compressed' ||
      mimeType === 'application/x-7z-compressed' ||
      mimeType === 'application/x-tar' ||
      mimeType === 'application/gzip'
    ) {
      allowedExtensions = this.ALLOWED_EXTENSIONS.archive;
    }

    if (allowedExtensions.length > 0 && !allowedExtensions.includes(ext)) {
      throw new BadRequestException(
        `File extension .${ext} is not allowed for ${mimeType} files`,
      );
    }
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
