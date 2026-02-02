import { Inject } from '@nestjs/common';
import { DomainException } from '@core/common';
import { FILE_RULES_CHECKER_TOKEN } from '../../constants/tokens';

/**
 * File Validation Context
 *
 * Context information for validation
 */
export interface FileValidationContext {
  fileId?: string;
  tenantId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  fileType?: string;
}

/**
 * File Validation Options
 */
export interface FileValidationOptions {
  /**
   * Maximum file size in bytes (default: 10MB)
   */
  maxFileSize?: number;

  /**
   * Allowed MIME types (if not specified, all types allowed)
   */
  allowedMimeTypes?: string[];

  /**
   * Allowed file types (IMAGE, DOCUMENT, VIDEO, AUDIO, etc.)
   */
  allowedFileTypes?: string[];

  /**
   * Whether to check if file already exists
   */
  checkDuplicate?: boolean;
}

/**
 * File Rules Checker Interface (Port)
 *
 * Interface cho việc kiểm tra các business rules của File.
 * Được định nghĩa ở Domain Layer.
 * Infrastructure Layer sẽ implement.
 */
export interface IFileRulesChecker {
  /**
   * Check if file name already exists in tenant
   *
   * @param tenantId Tenant ID
   * @param fileName File name to check
   * @param excludeFileId File ID to exclude from check (for updates)
   * @returns true if duplicate exists, false otherwise
   */
  checkDuplicateFileName(
    tenantId: string,
    fileName: string,
    excludeFileId?: string,
  ): Promise<boolean>;

  /**
   * Get file type from MIME type
   *
   * @param mimeType MIME type
   * @returns File type (IMAGE, DOCUMENT, VIDEO, AUDIO, OTHER)
   */
  getFileTypeFromMimeType(mimeType: string): string;
}

/**
 * File Validator Service
 *
 * Domain Service đảm bảo business rules:
 * - File size must be within limits
 * - File type must be allowed
 * - MIME type must be valid
 * - File name must be unique (optional)
 *
 * Tại sao đây là Domain Service?
 * - Validation logic thuộc về Domain
 * - Logic này không thuộc về một Aggregate cụ thể
 * - Cần truy query database để check duplicates → sử dụng Port interface
 *
 * Exception Strategy:
 * - Uses DomainException for validation failures
 *
 * Story 5.2: Validate File Upload
 *
 * @example
 * ```typescript
 * // Trong Command Handler
 * const validatorService = new FileValidationService(rulesChecker);
 * await validatorService.validateFile(context, options);
 * ```
 */
export class FileValidationService {
  constructor(
    @Inject(FILE_RULES_CHECKER_TOKEN)
    private readonly checker: IFileRulesChecker,
  ) {}

  /**
   * Default validation options
   */
  private readonly defaultOptions: FileValidationOptions = {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: undefined,
    allowedFileTypes: undefined,
    checkDuplicate: false,
  };

  /**
   * Validate file upload
   *
   * @param context Validation context
   * @param options Validation options
   * @throws DomainException if validation fails
   */
  async validateFile(
    context: FileValidationContext,
    options: FileValidationOptions = {},
  ): Promise<void> {
    const mergedOptions = { ...this.defaultOptions, ...options };

    // Validate file size
    this.validateFileSize(context.fileSize, mergedOptions.maxFileSize!);

    // Validate MIME type
    this.validateMimeType(context.mimeType, mergedOptions.allowedMimeTypes);

    // Validate file type
    await this.validateFileType(
      context.mimeType,
      this.checker,
      mergedOptions.allowedFileTypes,
    );

    // Check duplicate file name
    if (mergedOptions.checkDuplicate && context.fileName) {
      await this.checkDuplicateFileName(
        context.tenantId,
        context.fileName,
        context.fileId,
      );
    }
  }

  /**
   * Validate file size
   *
   * @param fileSize File size in bytes
   * @param maxFileSize Maximum allowed size
   * @throws DomainException if file size exceeds limit
   */
  private validateFileSize(fileSize: number, maxFileSize: number): void {
    if (fileSize <= 0) {
      throw new DomainException('File size must be greater than 0');
    }

    if (fileSize > maxFileSize) {
      const maxSizeMB = (maxFileSize / (1024 * 1024)).toFixed(2);
      const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
      throw new DomainException(
        `File size (${fileSizeMB}MB) exceeds maximum allowed size (${maxSizeMB}MB)`,
      );
    }
  }

  /**
   * Validate MIME type
   *
   * @param mimeType MIME type to validate
   * @param allowedMimeTypes List of allowed MIME types
   * @throws DomainException if MIME type is not allowed
   */
  private validateMimeType(
    mimeType: string,
    allowedMimeTypes?: string[],
  ): void {
    if (!mimeType || typeof mimeType !== 'string') {
      throw new DomainException('Invalid MIME type');
    }

    if (allowedMimeTypes && allowedMimeTypes.length > 0) {
      if (!allowedMimeTypes.includes(mimeType)) {
        throw new DomainException(
          `File type ${mimeType} is not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`,
        );
      }
    }
  }

  /**
   * Validate file type
   *
   * @param mimeType MIME type
   * @param checker Rules checker to get file type from MIME type
   * @param allowedFileTypes List of allowed file types
   * @throws DomainException if file type is not allowed
   */
  private async validateFileType(
    mimeType: string,
    checker: IFileRulesChecker,
    allowedFileTypes?: string[],
  ): Promise<void> {
    const fileType = checker.getFileTypeFromMimeType(mimeType);

    if (allowedFileTypes && allowedFileTypes.length > 0) {
      if (!allowedFileTypes.includes(fileType)) {
        throw new DomainException(
          `File type ${fileType} is not allowed. Allowed types: ${allowedFileTypes.join(', ')}`,
        );
      }
    }
  }

  /**
   * Check for duplicate file name
   *
   * @param tenantId Tenant ID
   * @param fileName File name to check
   * @param excludeFileId File ID to exclude (for updates)
   * @throws DomainException if duplicate exists
   */
  private async checkDuplicateFileName(
    tenantId: string,
    fileName: string,
    excludeFileId?: string,
  ): Promise<void> {
    const isDuplicate = await this.checker.checkDuplicateFileName(
      tenantId,
      fileName,
      excludeFileId,
    );

    if (isDuplicate) {
      throw new DomainException(
        `A file with name "${fileName}" already exists in this tenant`,
      );
    }
  }

  /**
   * Check if file is processable (image type)
   *
   * @param mimeType MIME type
   * @returns true if processable, false otherwise
   */
  isProcessable(mimeType: string): boolean {
    const imageMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/svg+xml',
    ];

    return imageMimeTypes.includes(mimeType);
  }

  /**
   * Check if file is downloadable (not deleted, not corrupted)
   *
   * @param fileStatus File status
   * @returns true if downloadable, false otherwise
   */
  isDownloadable(fileStatus: string): boolean {
    const downloadableStatuses = ['ACTIVE', 'PROCESSED'];
    return downloadableStatuses.includes(fileStatus);
  }
}
