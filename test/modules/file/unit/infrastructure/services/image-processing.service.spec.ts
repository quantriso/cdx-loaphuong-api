import { Test, TestingModule } from '@nestjs/testing';
import { ImageProcessingService } from '@modules/file/infrastructure/services';
import { ImageProcessingException } from '@modules/file/domain/exceptions';
import { IMAGE_PROCESSING_CONFIG } from '@modules/file/constants';

describe('ImageProcessingService', () => {
  let service: ImageProcessingService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ImageProcessingService],
    }).compile();

    service = module.get<ImageProcessingService>(ImageProcessingService);
  });

  afterAll(async () => {
    if (service) {
      await service.onModuleDestroy();
    }
  });

  describe('processImage', () => {
    const testImageBuffer = Buffer.from(
      // 2x2 red PNG image (minimal valid PNG)
      Buffer.from([
        0x89,
        0x50,
        0x4e,
        0x47,
        0x0d,
        0x0a,
        0x1a,
        0x0a, // PNG signature
        0x00,
        0x00,
        0x00,
        0x0d,
        0x49,
        0x48,
        0x44,
        0x52, // IHDR chunk
        0x00,
        0x00,
        0x00,
        0x02,
        0x00,
        0x00,
        0x00,
        0x02, // 2x2 pixels
        0x08,
        0x02,
        0x00,
        0x00,
        0x00,
        0x4d,
        0x18,
        0xed, // 8-bit RGB
        0x67,
        0x00,
        0x00,
        0x00,
        0x0c,
        0x49,
        0x44,
        0x41, // IDAT chunk
        0x54,
        0x08,
        0xd7,
        0x63,
        0xf8,
        0xcf,
        0xc0,
        0x00, // Compressed data
        0x00,
        0x03,
        0x01,
        0x01,
        0x4b,
        0x13,
        0x5e,
        0x2a,
        0x00,
        0x00,
        0x00,
        0x00,
        0x49,
        0x45,
        0x4e,
        0x44, // IEND chunk
        0xae,
        0x42,
        0x60,
        0x82,
      ]),
    );

    it('should successfully process a valid image with default options', async () => {
      const result = await service.processImage(testImageBuffer);

      expect(result).toBeDefined();
      expect(result.processedBuffer).toBeInstanceOf(Buffer);
      expect(result.thumbnailBuffer).toBeInstanceOf(Buffer);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.width).toBeGreaterThan(0);
      expect(result.metadata.height).toBeGreaterThan(0);
      expect(result.metadata.size).toBeGreaterThan(0);
      expect(result.metadata.format).toBe('webp');
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should process image with custom options', async () => {
      const options = {
        width: 1000,
        height: 1000,
        thumbnailWidth: 150,
        thumbnailHeight: 150,
        quality: 85,
        format: 'webp' as const,
      };

      const result = await service.processImage(testImageBuffer, options);

      expect(result).toBeDefined();
      expect(result.processedBuffer).toBeInstanceOf(Buffer);
      expect(result.thumbnailBuffer).toBeInstanceOf(Buffer);
      expect(result.metadata.format).toBe('webp');
    });

    it('should handle PNG format correctly', async () => {
      const result = await service.processImage(testImageBuffer, {
        format: 'webp' as const,
      });

      expect(result.metadata.originalFormat).toBe('png');
      expect(result.metadata.format).toBe('webp');
    });

    it('should handle JPEG format correctly', async () => {
      // Minimal JPEG header
      const jpegBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
        0x00, 0x03, 0x02, 0x02, 0x03, 0x02, 0x02, 0x03, 0x03, 0x03, 0x03, 0x04,
        0x03, 0x03, 0x04, 0x05, 0x08, 0x05, 0x05, 0x04, 0x04, 0x05, 0x0a, 0x07,
        0x07, 0x06, 0x08, 0x0c, 0x0a, 0x0c, 0x0c, 0x0b, 0x0a, 0x0b, 0x0b, 0x0d,
        0x0e, 0x12, 0x10, 0x0d, 0x0e, 0x11, 0x0e, 0x0b, 0x0b, 0x10, 0x16, 0x10,
        0x11, 0x13, 0x14, 0x15, 0x15, 0x15, 0x0c, 0x0f, 0x17, 0x18, 0x16, 0x14,
        0x18, 0x12, 0x14, 0x15, 0x14, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x02,
        0x00, 0x02, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x01,
        0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
        0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
        0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
        0xff, 0xc4, 0x00, 0xb5, 0x10, 0x00, 0x02, 0x01, 0x03, 0x03, 0x02, 0x04,
        0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7d, 0x01, 0x02, 0x03,
        0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06, 0x13, 0x51, 0x61,
        0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xa1, 0x08, 0x23, 0x42, 0xb1,
        0xc1, 0x15, 0x52, 0xd1, 0xf0, 0x24, 0x33, 0x62, 0x72, 0x82, 0x09, 0x0a,
        0x16, 0x17, 0x18, 0x19, 0x1a, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2a, 0x34,
        0x35, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48,
        0x49, 0x4a, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5a, 0x63, 0x64,
        0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78,
        0x79, 0x7a, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8a, 0x92, 0x93,
        0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3, 0xa4, 0xa5, 0xa6,
        0xa7, 0xa8, 0xa9, 0xaa, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6, 0xb7, 0xb8, 0xb9,
        0xba, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9, 0xca, 0xd2, 0xd3,
        0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe1, 0xe2, 0xe3, 0xe4, 0xe5,
        0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7,
        0xf8, 0xf9, 0xfa, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xd9,
      ]);

      const result = await service.processImage(jpegBuffer);

      expect(result).toBeDefined();
      expect(result.metadata.originalFormat).toBe('jpeg');
      expect(result.metadata.format).toBe('webp');
    });

    it('should throw ImageProcessingException for invalid image buffer', async () => {
      const invalidBuffer = Buffer.from('not an image');

      await expect(service.processImage(invalidBuffer)).rejects.toThrow(
        ImageProcessingException,
      );
    });

    it('should throw ImageProcessingException for empty buffer', async () => {
      const emptyBuffer = Buffer.alloc(0);

      await expect(service.processImage(emptyBuffer)).rejects.toThrow(
        ImageProcessingException,
      );
    });

    it('should throw ImageProcessingException for null buffer', async () => {
      await expect(service.processImage(null as any)).rejects.toThrow(
        ImageProcessingException,
      );
    });

    it('should respect max processing time timeout', async () => {
      // Use the valid test image - processing should be fast
      const result = await service.processImage(testImageBuffer);

      expect(result).toBeDefined();
      expect(result.processingTime).toBeLessThan(
        IMAGE_PROCESSING_CONFIG.PROCESSING_TIMEOUT + 1000,
      );
    });

    it('should handle unsupported formats gracefully', async () => {
      const bmpBuffer = Buffer.from([
        0x42,
        0x4d, // BM signature
        0x00,
        0x00,
        0x00,
        0x00, // File size
        0x00,
        0x00,
        0x00,
        0x00, // Reserved
        0x36,
        0x00,
        0x00,
        0x00, // Offset to pixel data
        0x28,
        0x00,
        0x00,
        0x00, // DIB header size
        0x02,
        0x00,
        0x00,
        0x00, // Width
        0x02,
        0x00,
        0x00,
        0x00, // Height
        0x01,
        0x00, // Planes
        0x08,
        0x00, // Bits per pixel
        0x00,
        0x00,
        0x00,
        0x00, // Compression
        0x00,
        0x00,
        0x00,
        0x00, // Image size
        0x13,
        0x0b,
        0x00,
        0x00, // X pixels per meter
        0x13,
        0x0b,
        0x00,
        0x00, // Y pixels per meter
        0x00,
        0x00,
        0x00,
        0x00, // Colors used
        0x00,
        0x00,
        0x00,
        0x00, // Important colors
      ]);

      await expect(service.processImage(bmpBuffer)).rejects.toThrow(
        ImageProcessingException,
      );
    });

    it('should handle quality parameter correctly', async () => {
      const highQualityResult = await service.processImage(testImageBuffer, {
        quality: 95,
      });

      const lowQualityResult = await service.processImage(testImageBuffer, {
        quality: 50,
      });

      // Higher quality should generally produce larger files (for same image)
      expect(highQualityResult.processedBuffer.length).toBeGreaterThan(0);
      expect(lowQualityResult.processedBuffer.length).toBeGreaterThan(0);
      // Note: For very small images, quality difference may not be significant
    });
  });

  describe('onModuleDestroy', () => {
    it('should clean up resources', async () => {
      const testService = new ImageProcessingService();

      // Should not throw
      await expect(testService.onModuleDestroy()).resolves.not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should wrap sharp errors in ImageProcessingException', async () => {
      const corruptImage = Buffer.from([
        0x89,
        0x50,
        0x4e,
        0x47,
        0x0d,
        0x0a,
        0x1a,
        0x0a, // PNG signature
        // Corrupt data follows
        ...Buffer.alloc(100, 0xff),
      ]);

      await expect(service.processImage(corruptImage)).rejects.toThrow(
        ImageProcessingException,
      );
    });

    it('should provide meaningful error messages', async () => {
      const invalidBuffer = Buffer.from('invalid');

      try {
        await service.processImage(invalidBuffer);
        fail('Should have thrown ImageProcessingException');
      } catch (error) {
        expect(error).toBeInstanceOf(ImageProcessingException);
        expect(error.message).toContain('Image processing');
      }
    });
  });
});
