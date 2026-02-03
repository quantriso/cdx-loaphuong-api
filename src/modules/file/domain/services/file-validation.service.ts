import { Inject } from '@nestjs/common';
import { DomainException } from '@core/common';
import { FILE_VALIDATION_RULES } from '../../constants/file-validation-rules';
import {
  FileSizeExceededException,
  InvalidFileTypeException,
  FileExtensionMismatchException,
  MaliciousFileException,
} from '../exceptions';
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
  fileBuffer?: Buffer;
}

/**
 * Validation Result
 */
export interface ValidationResult {
  isValid: boolean;
  errors?: string[];
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

  /**
   * Whether to validate file extension matches MIME type
   */
  checkExtension?: boolean;

  /**
   * Whether to scan for malicious content
   */
  scanForMalicious?: boolean;
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
   * Validate file upload (comprehensive validation)
   *
   * @param context Validation context
   * @param options Validation options
   * @throws FileSizeExceededException if file size exceeds limit
   * @throws InvalidFileTypeException if file type is not allowed
   * @throws FileExtensionMismatchException if extension doesn't match MIME type
   * @throws MaliciousFileException if malicious content is detected
   * @throws DomainException for other validation failures
   */
  async validateFile(
    context: FileValidationContext,
    options: FileValidationOptions = {},
  ): Promise<void> {
    const mergedOptions = {
      ...this.defaultOptions,
      checkExtension: true,
      scanForMalicious: true,
      ...options,
    };

    // Validate file size
    this.validateFileSize(
      context.fileSize,
      mergedOptions.maxFileSize!,
      context.fileName,
    );

    // Validate MIME type
    this.validateMimeType(
      context.mimeType,
      mergedOptions.allowedMimeTypes,
      context.fileName,
    );

    // Validate file extension matches MIME type
    if (mergedOptions.checkExtension) {
      this.validateFileExtension(
        context.fileName,
        context.mimeType,
        context.fileType,
      );
    }

    // Scan for malicious content
    if (mergedOptions.scanForMalicious && context.fileBuffer) {
      this.scanForMaliciousContent(context.fileName, context.fileBuffer);
    }

    // Validate file type
    await this.validateFileType(
      context.mimeType,
      this.checker,
      mergedOptions.allowedFileTypes,
      context.fileName,
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
   * Validate file without throwing exceptions
   *
   * @param context Validation context
   * @param options Validation options
   * @returns Validation result with errors if any
   */
  async validateFileSafe(
    context: FileValidationContext,
    options: FileValidationOptions = {},
  ): Promise<ValidationResult> {
    try {
      await this.validateFile(context, options);
      return { isValid: true };
    } catch (error) {
      if (error instanceof Error) {
        return { isValid: false, errors: [error.message] };
      }
      return { isValid: false, errors: ['Unknown validation error'] };
    }
  }

  /**
   * Validate file size
   *
   * @param fileSize File size in bytes
   * @param maxFileSize Maximum allowed size
   * @param fileName File name for error message
   * @throws FileSizeExceededException if file size exceeds limit
   */
  private validateFileSize(
    fileSize: number,
    maxFileSize: number,
    fileName: string,
  ): void {
    if (fileSize <= 0) {
      throw new DomainException('File size must be greater than 0');
    }

    if (fileSize > maxFileSize) {
      const fileType = this.checker.getFileTypeFromMimeType(
        this.extractMimeTypeFromFileName(fileName),
      );
      throw new FileSizeExceededException(fileSize, maxFileSize, fileType);
    }
  }

  /**
   * Validate MIME type
   *
   * @param mimeType MIME type to validate
   * @param allowedMimeTypes List of allowed MIME types
   * @param fileName File name for error message
   * @throws InvalidFileTypeException if MIME type is not allowed
   */
  private validateMimeType(
    mimeType: string,
    allowedMimeTypes?: string[],
    fileName?: string,
  ): void {
    if (!mimeType || typeof mimeType !== 'string') {
      throw new DomainException('Invalid MIME type');
    }

    // Check if MIME type is in the allowed list
    if (allowedMimeTypes && allowedMimeTypes.length > 0) {
      if (!allowedMimeTypes.includes(mimeType)) {
        throw new InvalidFileTypeException(fileName || 'unknown', mimeType);
      }
    }

    // Check if MIME type is in the global allowed list
    const isAllowed = FILE_VALIDATION_RULES.ALLOWED_MIME_TYPES.some(
      (allowed) => {
        // Exact match
        if (allowed === mimeType) return true;
        // Wildcard match (e.g., 'image/*')
        if (allowed.endsWith('/*')) {
          const category = allowed.split('/')[0];
          return mimeType.startsWith(category + '/');
        }
        return false;
      },
    );

    if (!isAllowed) {
      throw new InvalidFileTypeException(fileName || 'unknown', mimeType);
    }
  }

  /**
   * Validate file extension matches MIME type
   *
   * @param fileName File name
   * @param mimeType MIME type
   * @param fileType File type (optional, for error message)
   * @throws FileExtensionMismatchException if extension doesn't match MIME type
   */
  private validateFileExtension(
    fileName: string,
    mimeType: string,
    fileType?: string,
  ): void {
    const extension = this.extractExtension(fileName);
    if (!extension) {
      return; // No extension to validate
    }

    // Get expected extensions for this MIME type
    const expectedExtensions =
      FILE_VALIDATION_RULES.MIME_TYPE_TO_EXTENSION[mimeType];

    // If MIME type has a mapping, check if the extension matches
    if (expectedExtensions) {
      // If mimeType is mapped to extensions, check if current extension is in the list
      const allowedExtensions = Array.isArray(expectedExtensions)
        ? expectedExtensions
        : [expectedExtensions];

      if (!allowedExtensions.includes(extension)) {
        throw new FileExtensionMismatchException(fileName, extension, mimeType);
      }
    } else {
      // If extension has a mapping but MIME type doesn't match, throw error
      const expectedMimeType =
        FILE_VALIDATION_RULES.EXTENSION_TO_MIME_TYPE[extension];
      if (expectedMimeType && expectedMimeType !== mimeType) {
        throw new FileExtensionMismatchException(fileName, extension, mimeType);
      }
    }
  }

  /**
   * Scan file for malicious content
   *
   * @param fileName File name
   * @param fileBuffer File content buffer
   * @throws MaliciousFileException if malicious content is detected
   */
  private scanForMaliciousContent(fileName: string, fileBuffer: Buffer): void {
    const content = fileBuffer.toString(
      'binary',
      0,
      Math.min(1024, fileBuffer.length),
    ); // First 1KB

    // Check for malicious signatures
    for (const [pattern, description] of Object.entries(
      FILE_VALIDATION_RULES.MALICIOUS_SIGNATURES,
    )) {
      if (content.includes(pattern)) {
        throw new MaliciousFileException(fileName, description);
      }
    }

    // Check for embedded scripts in images
    if (this.containsEmbeddedScripts(fileBuffer, fileName)) {
      throw new MaliciousFileException(fileName, 'embedded script detected');
    }

    // Check for null bytes only in text-based files (not binary images/videos/documents)
    // Null bytes are normal in binary files like JPEG, PNG, PDF, etc.
    const extension = this.extractExtension(fileName);
    const textFileExtensions = [
      'txt',
      'html',
      'htm',
      'xml',
      'json',
      'csv',
      'log',
    ];

    if (extension && textFileExtensions.includes(extension)) {
      if (fileBuffer.includes(Buffer.from([0x00]))) {
        throw new MaliciousFileException(
          fileName,
          'null byte detected (binary injection)',
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
   * @param fileName File name for error message
   * @throws InvalidFileTypeException if file type is not allowed
   */
  private async validateFileType(
    mimeType: string,
    checker: IFileRulesChecker,
    allowedFileTypes?: string[],
    fileName?: string,
  ): Promise<void> {
    const fileType = checker.getFileTypeFromMimeType(mimeType);

    if (allowedFileTypes && allowedFileTypes.length > 0) {
      if (!allowedFileTypes.includes(fileType)) {
        throw new InvalidFileTypeException(fileName || 'unknown', mimeType);
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

  /**
   * Extract file extension from file name
   *
   * @param fileName File name
   * @returns File extension without dot (e.g., 'jpg')
   */
  private extractExtension(fileName: string): string | null {
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1 || lastDotIndex === fileName.length - 1) {
      return null;
    }
    return fileName.substring(lastDotIndex + 1).toLowerCase();
  }

  /**
   * Extract MIME type from file name (based on extension)
   *
   * @param fileName File name
   * @returns MIME type or 'application/octet-stream' if unknown
   */
  private extractMimeTypeFromFileName(fileName: string): string {
    const extension = this.extractExtension(fileName);
    if (!extension) {
      return 'application/octet-stream';
    }
    const mimeType = FILE_VALIDATION_RULES.EXTENSION_TO_MIME_TYPE[extension];
    return typeof mimeType === 'string' ? mimeType : 'application/octet-stream';
  }

  /**
   * Check if file buffer contains embedded scripts
   *
   * @param fileBuffer File content buffer
   * @param fileName File name
   * @returns true if embedded scripts detected, false otherwise
   */
  private containsEmbeddedScripts(
    fileBuffer: Buffer,
    fileName: string,
  ): boolean {
    const content = fileBuffer.toString('binary');

    // Common script signatures
    const scriptSignatures = [
      '<script',
      'javascript:',
      'eval(',
      'document.write',
      'onload=',
      'onerror=',
      '<?php',
      '<%',
    ];

    // For images, check if they contain script-like content
    if (fileName.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)) {
      // Image files should not contain these patterns
      for (const signature of scriptSignatures) {
        if (content.includes(signature)) {
          return true;
        }
      }
    }

    return false;
  }
}
