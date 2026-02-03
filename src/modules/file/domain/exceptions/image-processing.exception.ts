import { DomainException } from '@core/domain';

export interface ImageProcessingErrorMetadata {
  inputPath?: string;
  outputPath?: string;
  thumbnailPath?: string;
  options?: Record<string, any>;
  errorType?: string;
}

/**
 * Image Processing Exception
 *
 * Thrown when image processing operations fail.
 * Provides detailed metadata for debugging and logging.
 *
 * Story 5.3: Process Uploaded Images
 */
export class ImageProcessingException extends DomainException {
  constructor(
    message: string,
    public readonly metadata?: ImageProcessingErrorMetadata,
  ) {
    super(message, 'IMAGE_PROCESSING_ERROR');
    Object.setPrototypeOf(this, ImageProcessingException.prototype);
  }

  static resizeFailed(
    inputPath: string,
    outputPath: string,
    originalError: Error,
  ): ImageProcessingException {
    return new ImageProcessingException(
      `Failed to resize image: ${originalError.message}`,
      {
        inputPath,
        outputPath,
        errorType: 'RESIZE_FAILED',
        options: {},
      },
    );
  }

  static conversionFailed(
    inputPath: string,
    outputPath: string,
    targetFormat: string,
    originalError: Error,
  ): ImageProcessingException {
    return new ImageProcessingException(
      `Failed to convert image to ${targetFormat}: ${originalError.message}`,
      {
        inputPath,
        outputPath,
        errorType: 'CONVERSION_FAILED',
        options: { targetFormat },
      },
    );
  }

  static thumbnailGenerationFailed(
    inputPath: string,
    thumbnailPath: string,
    originalError: Error,
  ): ImageProcessingException {
    return new ImageProcessingException(
      `Failed to generate thumbnail: ${originalError.message}`,
      {
        inputPath,
        thumbnailPath,
        errorType: 'THUMBNAIL_GENERATION_FAILED',
        options: {},
      },
    );
  }

  static invalidFormat(format: string): ImageProcessingException {
    return new ImageProcessingException(`Unsupported image format: ${format}`, {
      errorType: 'INVALID_FORMAT',
      options: { format },
    });
  }

  static processingTimeout(timeoutMs: number): ImageProcessingException {
    return new ImageProcessingException(
      `Image processing timed out after ${timeoutMs}ms`,
      {
        errorType: 'PROCESSING_TIMEOUT',
        options: { timeoutMs },
      },
    );
  }

  static fileCorrupted(filePath: string): ImageProcessingException {
    return new ImageProcessingException(
      `Image file is corrupted or invalid: ${filePath}`,
      {
        inputPath: filePath,
        errorType: 'FILE_CORRUPTED',
        options: {},
      },
    );
  }

  static genericError(
    error: Error,
    context?: ImageProcessingErrorMetadata,
  ): ImageProcessingException {
    return new ImageProcessingException(
      `Image processing error: ${error.message}`,
      {
        ...context,
        errorType: 'GENERIC_ERROR',
        options: {},
      },
    );
  }
}
