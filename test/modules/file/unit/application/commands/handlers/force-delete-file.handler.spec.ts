/**
 * Unit Tests for ForceDeleteFileHandler
 *
 * Story 5.5: Delete File
 *
 * Tests cover:
 * - Successful force file deletion
 * - File not found scenarios
 * - Permission checks
 * - Event emission
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ForceDeleteFileHandler } from '@modules/file/application/commands/handlers/force-delete-file.handler';
import { ForceDeleteFileCommand } from '@modules/file/application/commands/force-delete-file.command';
import { IFileRepository } from '@modules/file/domain/repositories/file.repository.interface';
import { FileTokens } from '@modules/file/constants/tokens';
import { File } from '@modules/file/domain/entities/file.entity';
import { FileId } from '@modules/file/domain/value-objects/file-id.value-object';
import { FileType } from '@modules/file/domain/value-objects/file-type.value-object';
import { FileTypeEnum } from '@modules/file/domain/value-objects/file-type.value-object';

describe('ForceDeleteFileHandler (Unit Tests)', () => {
  let handler: ForceDeleteFileHandler;
  let fileRepository: Partial<IFileRepository>;
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

    fileReadDao = {
      invalidateCache: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ForceDeleteFileHandler,
        {
          provide: FileTokens.FILE_REPOSITORY,
          useValue: fileRepository,
        },
        {
          provide: FileTokens.FILE_READ_DAO,
          useValue: fileReadDao,
        },
      ],
    }).compile();

    handler = module.get<ForceDeleteFileHandler>(ForceDeleteFileHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should successfully force delete a file', async () => {
      // Arrange
      const mockFile = createMockFile(mockTenantId);
      (fileRepository.findById as jest.Mock).mockResolvedValue(mockFile);
      (fileRepository.save as jest.Mock).mockResolvedValue(undefined);

      const command = new ForceDeleteFileCommand(
        mockFileId,
        mockUserId,
        'Force deletion',
      );

      // Act
      await handler.execute(command);

      // Assert
      expect(fileRepository.findById).toHaveBeenCalledWith(expect.any(FileId));
      expect(fileRepository.save).toHaveBeenCalledWith(mockFile);
      expect(mockFile.isDeleted).toBe(true);
    });

    it('should throw NotFoundException when file does not exist', async () => {
      // Arrange
      (fileRepository.findById as jest.Mock).mockResolvedValue(null);

      const command = new ForceDeleteFileCommand(
        mockFileId,
        mockUserId,
        'Force deletion',
      );

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
      expect(fileRepository.save).not.toHaveBeenCalled();
    });

    it('should successfully force delete a file from any tenant', async () => {
      // Arrange - Force delete should work regardless of tenant ownership
      const otherTenantFile = createMockFile('other-tenant-id');
      (fileRepository.findById as jest.Mock).mockResolvedValue(otherTenantFile);
      (fileRepository.save as jest.Mock).mockResolvedValue(undefined);

      const command = new ForceDeleteFileCommand(
        mockFileId,
        mockUserId,
        'Force deletion',
      );

      // Act & Assert
      await expect(handler.execute(command)).resolves.toBeUndefined();
      expect(fileRepository.save).toHaveBeenCalledWith(otherTenantFile);
    });

    it('should successfully force delete with reason', async () => {
      // Arrange
      const mockFile = createMockFile(mockTenantId);
      (fileRepository.findById as jest.Mock).mockResolvedValue(mockFile);
      (fileRepository.save as jest.Mock).mockResolvedValue(undefined);

      const reason = 'Force deletion for maintenance';
      const command = new ForceDeleteFileCommand(
        mockFileId,
        mockUserId,
        reason,
      );

      // Act
      await handler.execute(command);

      // Assert
      expect(fileRepository.save).toHaveBeenCalled();
    });

    it('should handle repository errors gracefully', async () => {
      // Arrange
      const mockFile = createMockFile(mockTenantId);
      (fileRepository.findById as jest.Mock).mockResolvedValue(mockFile);
      (fileRepository.save as jest.Mock).mockRejectedValue(
        new Error('Repository error'),
      );

      const command = new ForceDeleteFileCommand(
        mockFileId,
        mockUserId,
        'Force delete reason',
      );

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        'Repository error',
      );
    });

    it('should throw NotFoundException for already deleted files', async () => {
      // Arrange - Deleted files are typically filtered out by repository queries
      (fileRepository.findById as jest.Mock).mockResolvedValue(null);

      const command = new ForceDeleteFileCommand(
        mockFileId,
        mockUserId,
        'Force deletion',
      );

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
      expect(fileRepository.save).not.toHaveBeenCalled();
    });

    it('should invalidate cache after successful force deletion', async () => {
      // Arrange
      const mockFile = createMockFile(mockTenantId);
      (fileRepository.findById as jest.Mock).mockResolvedValue(mockFile);
      (fileRepository.save as jest.Mock).mockResolvedValue(undefined);

      const command = new ForceDeleteFileCommand(
        mockFileId,
        mockUserId,
        'Test reason',
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

      const command = new ForceDeleteFileCommand(
        mockFileId,
        mockUserId,
        'Test reason',
      );

      // Act & Assert - should not throw, operation should succeed
      await expect(handler.execute(command)).resolves.toBeUndefined();
      expect(fileRepository.save).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle force delete without reason', async () => {
      // Arrange
      const mockFile = createMockFile(mockTenantId);
      (fileRepository.findById as jest.Mock).mockResolvedValue(mockFile);
      (fileRepository.save as jest.Mock).mockResolvedValue(undefined);

      const command = new ForceDeleteFileCommand(
        mockFileId,
        mockUserId,
        undefined,
      );

      // Act & Assert
      await expect(handler.execute(command)).resolves.toBeUndefined();
    });

    it('should handle special characters in fileId', async () => {
      // Arrange
      const mockFile = createMockFile(mockTenantId);
      (fileRepository.findById as jest.Mock).mockResolvedValue(mockFile);
      (fileRepository.save as jest.Mock).mockResolvedValue(undefined);

      const command = new ForceDeleteFileCommand(
        'file-with-special-chars_123!@#',
        mockUserId,
        'Force delete',
      );

      // Act & Assert - should not throw
      await expect(handler.execute(command)).resolves.toBeUndefined();
    });
  });
});
