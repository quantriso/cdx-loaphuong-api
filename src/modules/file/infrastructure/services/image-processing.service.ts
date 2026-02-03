import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import sharp from 'sharp';
import { ImageProcessingException } from '../../domain/exceptions/image-processing.exception';
import { IMAGE_PROCESSING_CONFIG } from '../../constants/file-validation-rules';

export interface ImageProcessingResult {
  processedBuffer: Buffer;
  thumbnailBuffer: Buffer;
  metadata: ImageMetadata;
  processingTime: number;
}

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
  originalFormat?: string;
}

export interface ProcessingOptions {
  width?: number;
  height?: number;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

/**
 * Image Processing Service
 *
 * Story 5.3: Process Uploaded Images
 *
 * Uses Sharp library for high-performance image processing.
 * Features:
 * - Resize to max width 2000px (maintaining aspect ratio)
 * - Compress to 80% quality
 * - Convert to WebP format
 * - Generate thumbnail at 300x300px (center crop)
 * - Extract metadata (dimensions, size, format)
 * - Retry logic (1 attempt)
 * - Timeout protection (10 seconds)
 * - EXIF rotation support
 * - Memory usage monitoring
 */
@Injectable()
export class ImageProcessingService implements OnModuleDestroy {
  private readonly logger = new Logger(ImageProcessingService.name);

  async processImage(
    inputBuffer: Buffer,
    options: ProcessingOptions = {},
  ): Promise<ImageProcessingResult> {
    const startTime = Date.now();

    // Memory monitoring - Story 5.3
    const memoryBefore = process.memoryUsage();
    this.logger.debug(
      `Memory before processing: ${this.formatMemoryUsage(memoryBefore)}`,
    );

    try {
      // Validate input buffer
      if (!inputBuffer || inputBuffer.length === 0) {
        throw ImageProcessingException.fileCorrupted('Empty buffer');
      }

      // Apply default options
      const processingOptions: ProcessingOptions = {
        width: options.width || IMAGE_PROCESSING_CONFIG.DEFAULT_WIDTH,
        height: options.height || IMAGE_PROCESSING_CONFIG.DEFAULT_HEIGHT,
        thumbnailWidth:
          options.thumbnailWidth || IMAGE_PROCESSING_CONFIG.THUMBNAIL_WIDTH,
        thumbnailHeight:
          options.thumbnailHeight || IMAGE_PROCESSING_CONFIG.THUMBNAIL_HEIGHT,
        quality: options.quality || IMAGE_PROCESSING_CONFIG.DEFAULT_QUALITY,
        format: options.format || IMAGE_PROCESSING_CONFIG.DEFAULT_FORMAT,
      };

      this.logger.log(
        `Starting image processing. Options: ${JSON.stringify(processingOptions)}`,
      );

      // Load image with timeout protection
      const image = await this.withTimeout(
        sharp(inputBuffer).metadata(),
        IMAGE_PROCESSING_CONFIG.PROCESSING_TIMEOUT,
      );

      // Validate format
      if (!this.isSupportedFormat(image.format)) {
        throw ImageProcessingException.invalidFormat(image.format || 'unknown');
      }

      const originalFormat = image.format || 'unknown';
      this.logger.debug(
        `Original image: ${image.width}x${image.height}, format: ${originalFormat}, size: ${inputBuffer.length} bytes`,
      );

      // Process image (resize + convert to WebP) with EXIF rotation
      const processedBuffer = await this.withTimeout(
        this.processMainImage(inputBuffer, processingOptions),
        IMAGE_PROCESSING_CONFIG.PROCESSING_TIMEOUT,
      );

      // Generate thumbnail
      const thumbnailBuffer = await this.withTimeout(
        this.generateThumbnail(inputBuffer, processingOptions),
        IMAGE_PROCESSING_CONFIG.PROCESSING_TIMEOUT,
      );

      // Extract metadata from processed image
      const metadata = await sharp(processedBuffer).metadata();

      const result: ImageMetadata = {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || processingOptions.format || 'webp',
        size: processedBuffer.length,
        originalFormat,
      };

      const processingTime = Date.now() - startTime;

      // Memory monitoring after processing - Story 5.3
      const memoryAfter = process.memoryUsage();
      const memoryUsed = memoryAfter.heapUsed - memoryBefore.heapUsed;
      this.logger.log(
        `Memory usage: ${this.formatMemoryUsage(memoryAfter)} ` +
          `(delta: ${this.formatBytes(memoryUsed)})`,
      );

      // Alert if memory usage is high (> 100MB for single image)
      const MEMORY_ALERT_THRESHOLD = 100 * 1024 * 1024; // 100MB
      if (memoryUsed > MEMORY_ALERT_THRESHOLD) {
        this.logger.warn(
          `High memory usage detected: ${this.formatBytes(memoryUsed)} ` +
            `for single image processing`,
        );
      }

      // Performance alert if exceeds threshold (Story 5.3)
      if (
        processingTime > IMAGE_PROCESSING_CONFIG.PERFORMANCE_ALERT_THRESHOLD
      ) {
        this.logger.warn(
          `Image processing took ${processingTime}ms, exceeding threshold of ${IMAGE_PROCESSING_CONFIG.PERFORMANCE_ALERT_THRESHOLD}ms`,
        );
      }

      this.logger.log(
        `Image processing completed in ${processingTime}ms. ` +
          `Processed: ${result.width}x${result.height}, ${result.size} bytes. ` +
          `Thumbnail: ${thumbnailBuffer.length} bytes`,
      );

      return {
        processedBuffer,
        thumbnailBuffer,
        metadata: result,
        processingTime,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const memoryAfter = process.memoryUsage();
      const memoryUsed = memoryAfter.heapUsed - memoryBefore.heapUsed;

      this.logger.error(
        `Image processing failed after ${processingTime}ms. ` +
          `Memory used: ${this.formatBytes(memoryUsed)}. ` +
          `Error: ${error.message}`,
        error.stack,
      );

      if (error instanceof ImageProcessingException) {
        throw error;
      }

      throw ImageProcessingException.genericError(error, {
        options,
      });
    }
  }

  /**
   * Format memory usage for logging
   * Story 5.3: Memory usage monitoring
   */
  private formatMemoryUsage(memory: NodeJS.MemoryUsage): string {
    return `heap: ${this.formatBytes(memory.heapUsed)}/${this.formatBytes(memory.heapTotal)}${memory.external > 0 ? `, external: ${this.formatBytes(memory.external)}` : ''}`;
  }

  /**
   * Format bytes to human-readable string
   * Story 5.3: Memory usage monitoring
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  /**
   * Process main image with retry logic
   * Story 5.3: Retry once on failure
   */
  /**
   * Process main image with retry logic
   * Story 5.3: Retry once on failure, handle EXIF rotation
   */
  private async processMainImage(
    inputBuffer: Buffer,
    options: ProcessingOptions,
  ): Promise<Buffer> {
    return this.withRetry(async () => {
      try {
        return await sharp(inputBuffer)
          .rotate() // Auto-rotate based on EXIF data
          .resize({
            width: options.width,
            height: options.height,
            fit: 'inside', // Maintains aspect ratio
            withoutEnlargement: false, // Allow enlarging small images
          })
          .toFormat(options.format || 'webp', {
            quality: options.quality || IMAGE_PROCESSING_CONFIG.DEFAULT_QUALITY,
          })
          .toBuffer();
      } catch (error) {
        throw ImageProcessingException.conversionFailed(
          'buffer',
          `processed.${options.format || 'webp'}`,
          options.format || 'webp',
          error,
        );
      }
    });
  }

  /**
   * Generate thumbnail with center crop
   * Story 5.3: Generate thumbnail at 300x300px
   */
  private async generateThumbnail(
    inputBuffer: Buffer,
    options: ProcessingOptions,
  ): Promise<Buffer> {
    return this.withRetry(async () => {
      try {
        return await sharp(inputBuffer)
          .resize({
            width: options.thumbnailWidth || 300,
            height: options.thumbnailHeight || 300,
            fit: 'cover', // Center crop
            position: 'center',
          })
          .toFormat(options.format || 'webp', {
            quality: IMAGE_PROCESSING_CONFIG.THUMBNAIL_QUALITY || 75,
          })
          .toBuffer();
      } catch (error) {
        throw ImageProcessingException.thumbnailGenerationFailed(
          'buffer',
          `thumbnail_${options.format || 'webp'}`,
          error,
        );
      }
    });
  }

  /**
   * Retry logic for processing operations
   * Story 5.3: Retry once on failure
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    retries: number = IMAGE_PROCESSING_CONFIG.MAX_RETRIES,
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt < retries) {
          const delay = IMAGE_PROCESSING_CONFIG.RETRY_DELAY_MS || 1000;
          this.logger.warn(
            `Processing attempt ${attempt + 1} failed. Retrying in ${delay}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Unknown error during retry');
  }

  /**
   * Timeout protection
   * Story 5.3: Timeout after 10 seconds
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(ImageProcessingException.processingTimeout(timeoutMs)),
          timeoutMs,
        ),
      ),
    ]);
  }

  /**
   * Check if format is supported
   */
  private isSupportedFormat(format?: string): boolean {
    if (!format) return false;
    const supported = ['jpeg', 'jpg', 'png', 'webp', 'gif', 'tiff', 'avif'];
    return supported.includes(format.toLowerCase());
  }

  /**
   * Clean up resources when module is destroyed
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.debug('Cleaning up ImageProcessingService resources');
    // Sharp automatically manages its resources, but we can log cleanup
  }
}
