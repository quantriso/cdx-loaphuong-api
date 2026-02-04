/**
 * Unit Tests for DeleteFileHandler
 *
 * Story 5.5: Delete File
 *
 * Tests cover:
 * - Successful file deletion
 * - File not found scenarios
 * - Permission checks
 * - Tenant ownership validation
 * - Event emission
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DeleteFileHandler } from '@modules/file/application/commands/handlers/delete-file.handler';
import { DeleteFileCommand } from '@modules/file/application/commands/delete-file.command';
import { IFileRepository } from '@modules/file/domain/repositories/file.repository.interface';
import {
  FILE_ATTACHMENT_CHECKER_TOKEN,
  FileTokens,
} from '@modules/file/constants/tokens';
import { File } from '@modules/file/domain/entities/file.entity';
import { FileId } from '@modules/file/domain/value-objects/file-id.value-object';
import { FileInUseException } from '@modules/file/domain/exceptions';
import { FileAttachmentCheckerService } from '@modules/file/infrastructure/services/file-attachment-checker.service';
import { FileType } from '@modules/file/domain/value-objects/file-type.value-object';
import { FileTypeEnum } from '@modules/file/domain/value-objects/file-type.value-object';

describe('DeleteFileHandler (Unit Tests)', () => {
  let handler: DeleteFileHandler;
  let fileRepository: Partial<IFileRepository>;
  let fileAttachmentChecker: Partial<FileAttachmentCheckerService>;
  let fileReadDao: any;

  const mockFileId = 'file-123';
  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-123';

  const createMockFile = (tenantId: string, isDeleted: boolean = false) => {
    const file = File.createNew(
      tenantId,
      'test.jpg',
      'image/jpeg',
      1024,
      new FileType(FileTypeEnum.IMAGE),
      '/uploads/test.jpg',
      mockUserId,
    );

    if (isDeleted) {
      file.delete();
    }

    return file;
  };

  beforeEach(async () => {
    fileRepository = {
      findById: jest.fn(),
      save: jest.fn(),
    };

    fileAttachmentChecker = {
      checkFileUsage: jest.fn().mockResolvedValue(undefined),
    };

    fileReadDao = {
      invalidateCache: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteFileHandler,
        {
          provide: FileTokens.FILE_REPOSITORY,
          useValue: fileRepository,
        },
        {
          provide: FILE_ATTACHMENT_CHECKER_TOKEN,
          useValue: fileAttachmentChecker,
        },
        {
          provide: FileTokens.FILE_READ_DAO,
          useValue: fileReadDao,
        },
      ],
    }).compile();

    handler = module.get<DeleteFileHandler>(DeleteFileHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should successfully delete a file', async () => {
      // Arrange
      const mockFile = createMockFile(mockTenantId);
      (fileRepository.findById as jest.Mock).mockResolvedValue(mockFile);
      (fileRepository.save as jest.Mock).mockResolvedValue(undefined);

      const command = new DeleteFileCommand(
        mockFileId,
        mockUserId,
        mockTenantId,
      );

      // Act
      await handler.execute(command);

      // Assert
      expect(fileRepository.findById).toHaveBeenCalledWith(expect.any(FileId));
      expect(fileAttachmentChecker.checkFileUsage).toHaveBeenCalledWith(
        mockFileId,
      );
      expect(fileRepository.save).toHaveBeenCalledWith(mockFile);
      expect(mockFile.isDeleted).toBe(true);
    });

    it('should throw NotFoundException when file does not exist', async () => {
      // Arrange
      (fileRepository.findById as jest.Mock).mockResolvedValue(null);

      const command = new DeleteFileCommand(
        mockFileId,
        mockUserId,
        mockTenantId,
      );

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
      expect(fileRepository.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when trying to delete non-existent file', async () => {
      // Arrange
      (fileRepository.findById as jest.Mock).mockResolvedValue(null);

      const command = new DeleteFileCommand(
        'non-existent-id',
        mockUserId,
        mockTenantId,
      );

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
      expect(fileRepository.findById).toHaveBeenCalled();
      expect(fileRepository.save).not.toHaveBeenCalled();
    });

    it('should throw error when file belongs to different tenant', async () => {
      // Arrange
      const otherTenantFile = createMockFile('other-tenant-id');
      (fileRepository.findById as jest.Mock).mockResolvedValue(otherTenantFile);

      const command = new DeleteFileCommand(
        mockFileId,
        mockUserId,
        mockTenantId,
      );

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
      expect(fileRepository.save).not.toHaveBeenCalled();
    });

    it('should throw FileInUseException when file is attached to published content', async () => {
      // Arrange
      const mockFile = createMockFile(mockTenantId);
      (fileRepository.findById as jest.Mock).mockResolvedValue(mockFile);
      (fileAttachmentChecker.checkFileUsage as jest.Mock).mockRejectedValue(
        new FileInUseException(mockFileId, 'content'),
      );

      const command = new DeleteFileCommand(
        mockFileId,
        mockUserId,
        mockTenantId,
      );

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        FileInUseException,
      );
      expect(fileAttachmentChecker.checkFileUsage).toHaveBeenCalledWith(
        mockFileId,
      );
      expect(fileRepository.save).not.toHaveBeenCalled();
    });

    it('should handle repository errors gracefully', async () => {
      // Arrange
      const mockFile = createMockFile(mockTenantId);
      (fileRepository.findById as jest.Mock).mockResolvedValue(mockFile);
      (fileRepository.save as jest.Mock).mockRejectedValue(
        new Error('Database connection failed'),
      );

      const command = new DeleteFileCommand(
        mockFileId,
        mockUserId,
        mockTenantId,
      );

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should invalidate cache after successful deletion', async () => {
      // Arrange
      const mockFile = createMockFile(mockTenantId);
      (fileRepository.findById as jest.Mock).mockResolvedValue(mockFile);
      (fileRepository.save as jest.Mock).mockResolvedValue(undefined);

      const command = new DeleteFileCommand(
        mockFileId,
        mockUserId,
        mockTenantId,
      );

      // Act
      await handler.execute(command);

      // Assert
      expect(fileReadDao.invalidateCache).toHaveBeenCalledWith(
        mockFileId,
        mockTenantId,
      );
    });

    it('should handle cache invalidation errors gracefully', async () => {
      // Arrange
      const mockFile = createMockFile(mockTenantId);
      (fileRepository.findById as jest.Mock).mockResolvedValue(mockFile);
      (fileRepository.save as jest.Mock).mockResolvedValue(undefined);
      (fileReadDao.invalidateCache as jest.Mock).mockRejectedValue(
        new Error('Cache error'),
      );

      const command = new DeleteFileCommand(
        mockFileId,
        mockUserId,
        mockTenantId,
      );

      // Act & Assert - should not throw, operation should succeed
      await expect(handler.execute(command)).resolves.toBeUndefined();
      expect(fileRepository.save).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should throw error when creating command with empty fileId', () => {
      // Act & Assert
      expect(() => new DeleteFileCommand('', mockUserId, mockTenantId)).toThrow(
        'File ID is required',
      );
    });

    it('should throw error when creating command with null fileId', () => {
      // Act & Assert
      expect(
        () => new DeleteFileCommand(null as any, mockUserId, mockTenantId),
      ).toThrow('File ID is required');
    });

    it('should throw error when creating command with empty deletedBy', () => {
      // Act & Assert
      expect(() => new DeleteFileCommand(mockFileId, '', mockTenantId)).toThrow(
        'Deleted by is required',
      );
    });

    it('should throw error when creating command with empty tenantId', () => {
      // Act & Assert
      expect(() => new DeleteFileCommand(mockFileId, mockUserId, '')).toThrow(
        'Tenant ID is required',
      );
    });

    it('should handle special characters in fileId', async () => {
      // Arrange
      const mockFile = createMockFile(mockTenantId);
      (fileRepository.findById as jest.Mock).mockResolvedValue(mockFile);
      (fileRepository.save as jest.Mock).mockResolvedValue(undefined);

      const command = new DeleteFileCommand(
        'file-with-special-chars_123!@#',
        mockUserId,
        mockTenantId,
      );

      // Act & Assert - should not throw
      await expect(handler.execute(command)).resolves.toBeUndefined();
    });
  });
});
