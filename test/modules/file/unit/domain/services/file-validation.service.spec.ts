import {
  FileValidationService,
  IFileRulesChecker,
} from 'src/modules/file/domain/services/file-validation.service';
import { InvalidFileTypeException } from 'src/modules/file/domain/exceptions/invalid-file-type.exception';
import { FileSizeExceededException } from 'src/modules/file/domain/exceptions/file-size-exceeded.exception';
import { FileExtensionMismatchException } from 'src/modules/file/domain/exceptions/file-extension-mismatch.exception';
import { MaliciousFileException } from 'src/modules/file/domain/exceptions/malicious-file.exception';

describe('FileValidationService', () => {
  let service: FileValidationService;
  let mockRulesChecker: jest.Mocked<IFileRulesChecker>;

  beforeEach(() => {
    mockRulesChecker = {
      checkDuplicateFileName: jest.fn().mockResolvedValue(false),
      getFileTypeFromMimeType: jest.fn((mimeType: string) => {
        if (mimeType.startsWith('image/')) return 'IMAGE';
        if (mimeType.startsWith('video/')) return 'VIDEO';
        if (mimeType.startsWith('audio/')) return 'AUDIO';
        if (mimeType === 'application/pdf') return 'DOCUMENT';
        return 'OTHER';
      }),
    } as jest.Mocked<IFileRulesChecker>;

    // Create service directly without NestJS Test Module
    service = new FileValidationService(mockRulesChecker as any);
  });

  describe('validateFile', () => {
    const validContext = {
      tenantId: 'tenant-123',
      fileName: 'test-image.jpg',
      mimeType: 'image/jpeg',
      fileSize: 1024 * 1024, // 1MB
      fileBuffer: Buffer.from('fake image data'),
    };

    it('should successfully validate a valid image file', async () => {
      let error: Error | undefined;
      try {
        await service.validateFile(validContext, {
          maxFileSize: 50 * 1024 * 1024,
          checkDuplicate: false,
          checkExtension: true,
          scanForMalicious: false,
        });
      } catch (e) {
        error = e as Error;
      }
      expect(error).toBeUndefined();
    });

    it('should reject file with invalid MIME type', async () => {
      const invalidContext = {
        ...validContext,
        mimeType: 'application/x-msdownload', // Executable
      };

      await expect(
        service.validateFile(invalidContext, {
          maxFileSize: 50 * 1024 * 1024,
          checkDuplicate: false,
          checkExtension: true,
          scanForMalicious: false,
        }),
      ).rejects.toThrow(InvalidFileTypeException);
    });

    it('should reject file exceeding size limit', async () => {
      const oversizedContext = {
        ...validContext,
        fileSize: 60 * 1024 * 1024, // 60MB
      };

      await expect(
        service.validateFile(oversizedContext, {
          maxFileSize: 50 * 1024 * 1024,
          checkDuplicate: false,
          checkExtension: true,
          scanForMalicious: false,
        }),
      ).rejects.toThrow(FileSizeExceededException);
    });

    it('should reject file with mismatched extension and MIME type', async () => {
      const mismatchedContext = {
        ...validContext,
        fileName: 'test-image.pdf', // PDF extension but JPEG MIME
        mimeType: 'image/jpeg',
      };

      await expect(
        service.validateFile(mismatchedContext, {
          maxFileSize: 50 * 1024 * 1024,
          checkDuplicate: false,
          checkExtension: true,
          scanForMalicious: false,
        }),
      ).rejects.toThrow(FileExtensionMismatchException);
    });

    it('should detect malicious file patterns', async () => {
      // Create buffer with potential malicious pattern
      const maliciousBuffer = Buffer.from('<?php echo "malicious"; ?>');

      const maliciousContext = {
        ...validContext,
        fileName: 'test.php',
        mimeType: 'application/x-httpd-php',
        fileBuffer: maliciousBuffer,
      };

      await expect(
        service.validateFile(maliciousContext, {
          maxFileSize: 50 * 1024 * 1024,
          checkDuplicate: false,
          checkExtension: true,
          scanForMalicious: true,
        }),
      ).rejects.toThrow(MaliciousFileException);
    });

    it('should detect malicious script tags', async () => {
      const maliciousBuffer = Buffer.from('<script>alert("xss")</script>');

      const maliciousContext = {
        ...validContext,
        fileName: 'test.html',
        mimeType: 'text/html',
        fileBuffer: maliciousBuffer,
      };

      await expect(
        service.validateFile(maliciousContext, {
          maxFileSize: 50 * 1024 * 1024,
          checkDuplicate: false,
          checkExtension: true,
          scanForMalicious: true,
        }),
      ).rejects.toThrow(MaliciousFileException);
    });

    it('should skip extension check when disabled', async () => {
      const mismatchedContext = {
        ...validContext,
        fileName: 'test-image.pdf', // PDF extension but JPEG MIME
        mimeType: 'image/jpeg',
      };

      let error: Error | undefined;
      try {
        await service.validateFile(mismatchedContext, {
          maxFileSize: 50 * 1024 * 1024,
          checkDuplicate: false,
          checkExtension: false, // Disabled
          scanForMalicious: false,
        });
      } catch (e) {
        error = e as Error;
      }
      expect(error).toBeUndefined();
    });

    it('should skip malicious scan when disabled', async () => {
      const maliciousBuffer = Buffer.from('<script>alert("xss")</script>');

      const maliciousContext = {
        ...validContext,
        fileName: 'test.html',
        mimeType: 'text/html',
        fileBuffer: maliciousBuffer,
      };

      let error: Error | undefined;
      try {
        await service.validateFile(maliciousContext, {
          maxFileSize: 50 * 1024 * 1024,
          checkDuplicate: false,
          checkExtension: true,
          scanForMalicious: false, // Disabled
        });
      } catch (e) {
        error = e as Error;
      }
      expect(error).toBeUndefined();
    });
  });

  describe('isProcessable', () => {
    it('should return true for image MIME types', () => {
      expect(service.isProcessable('image/jpeg')).toBe(true);
      expect(service.isProcessable('image/png')).toBe(true);
      expect(service.isProcessable('image/gif')).toBe(true);
      expect(service.isProcessable('image/webp')).toBe(true);
    });

    it('should return false for non-image MIME types', () => {
      expect(service.isProcessable('application/pdf')).toBe(false);
      expect(service.isProcessable('video/mp4')).toBe(false);
      expect(service.isProcessable('audio/mp3')).toBe(false);
    });
  });

  describe('isDownloadable', () => {
    it('should return true for downloadable statuses', () => {
      expect(service.isDownloadable('ACTIVE')).toBe(true);
      expect(service.isDownloadable('PROCESSED')).toBe(true);
    });

    it('should return false for non-downloadable statuses', () => {
      expect(service.isDownloadable('DELETED')).toBe(false);
      expect(service.isDownloadable('CORRUPTED')).toBe(false);
    });
  });
});
