import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { GetDownloadUrlHandler } from 'src/modules/file/application/commands/handlers/get-download-url.handler';
import { GetDownloadUrlCommand } from 'src/modules/file/application/commands/get-download-url.command';
import type { IFileRepository } from 'src/modules/file/domain/repositories/file.repository.interface';
import type { IStorageService } from 'src/modules/file/infrastructure/services/storage.interface';
import { FileTokens } from 'src/modules/file/constants';
import { File } from 'src/modules/file/domain/entities/file.entity';
import { FileId } from 'src/modules/file/domain/value-objects/file-id.value-object';
import { FileTypeEnum } from 'src/modules/file/domain/value-objects/file-type.value-object';
import { FileNotFoundException } from 'src/modules/file/domain/exceptions';
import { EVENT_BUS_TOKEN } from '@core/constants';
import type { IEventBus } from '@core/infrastructure';

describe('GetDownloadUrlHandler', () => {
  let handler: GetDownloadUrlHandler;
  let fileRepository: jest.Mocked<IFileRepository>;
  let storageService: jest.Mocked<IStorageService>;
  let eventBus: jest.Mocked<IEventBus>;
  let commandBus: CommandBus;

  const fileType =
    new (require('src/modules/file/domain/value-objects/file-type.value-object').FileType)(
      FileTypeEnum.IMAGE,
    );

  const mockFile = File.createNew(
    'tenant-1',
    'test.jpg',
    'image/jpeg',
    1024,
    fileType,
    'tenant-1/test.jpg',
    'user-1',
  );

  beforeEach(async () => {
    const mockRepository = {
      findById: jest.fn(),
    };

    const mockStorageService = {
      saveFile: jest.fn(),
      getFile: jest.fn(),
      deleteFile: jest.fn(),
      fileExists: jest.fn(),
      generatePresignedUrl: jest.fn(),
    };

    const mockEventBus = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetDownloadUrlHandler,
        CommandBus,
        {
          provide: FileTokens.FILE_REPOSITORY,
          useValue: mockRepository,
        },
        {
          provide: FileTokens.FILE_STORAGE,
          useValue: mockStorageService,
        },
        {
          provide: EVENT_BUS_TOKEN,
          useValue: mockEventBus,
        },
      ],
    }).compile();

    handler = module.get<GetDownloadUrlHandler>(GetDownloadUrlHandler);
    fileRepository = module.get(FileTokens.FILE_REPOSITORY);
    storageService = module.get(FileTokens.FILE_STORAGE);
    eventBus = module.get(EVENT_BUS_TOKEN);
    commandBus = module.get(CommandBus);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should generate download URL for original version', async () => {
      // Arrange
      const fileId = mockFile.id;
      const tenantId = 'tenant-1';
      const version = 'original';
      const presignedUrl = 'https://storage.example.com/signed-url';

      fileRepository.findById.mockResolvedValue(mockFile);
      storageService.generatePresignedUrl.mockResolvedValue(presignedUrl);

      const command = new GetDownloadUrlCommand(
        fileId,
        tenantId,
        version,
        'user-1',
        undefined,
        '127.0.0.1',
        'test-agent',
      );

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(fileRepository.findById).toHaveBeenCalledWith(new FileId(fileId));
      expect(storageService.generatePresignedUrl).toHaveBeenCalledWith(
        mockFile.storagePath,
        900,
      );
      expect(result).toEqual({
        downloadUrl: presignedUrl,
        fileName: mockFile.originalFileName,
        mimeType: mockFile.mimeType,
        fileSize: mockFile.fileSize,
        expiresAt: expect.any(Date),
      });
      expect(eventBus.publish).toHaveBeenCalled();
    });

    it('should generate download URL for processed version', async () => {
      // Arrange
      const processedFile = File.createNew(
        'tenant-1',
        'test.jpg',
        'image/jpeg',
        1024,
        fileType,
        'tenant-1/test.jpg',
        'user-1',
      );

      // Manually set processed path
      (processedFile as any)._props.processedPath =
        'tenant-1/processed/test.jpg';

      const fileId = processedFile.id;
      const tenantId = 'tenant-1';
      const version = 'processed';
      const presignedUrl = 'https://storage.example.com/signed-url';

      fileRepository.findById.mockResolvedValue(processedFile);
      storageService.generatePresignedUrl.mockResolvedValue(presignedUrl);

      const command = new GetDownloadUrlCommand(
        fileId,
        tenantId,
        version,
        'user-1',
        undefined,
        '127.0.0.1',
        'test-agent',
      );

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(storageService.generatePresignedUrl).toHaveBeenCalledWith(
        processedFile.processedPath,
        900,
      );
      expect(result.fileName).toBe(processedFile.originalFileName);
    });

    it('should fallback to original when processed version does not exist', async () => {
      // Arrange
      const fileId = mockFile.id;
      const tenantId = 'tenant-1';
      const version = 'processed';
      const presignedUrl = 'https://storage.example.com/signed-url';

      fileRepository.findById.mockResolvedValue(mockFile);
      storageService.generatePresignedUrl.mockResolvedValue(presignedUrl);

      const command = new GetDownloadUrlCommand(
        fileId,
        tenantId,
        version,
        'user-1',
        undefined,
        '127.0.0.1',
        'test-agent',
      );

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(storageService.generatePresignedUrl).toHaveBeenCalledWith(
        mockFile.storagePath,
        900,
      );
      expect(result.fileName).toBe(mockFile.originalFileName);
    });

    it('should generate download URL for thumbnail version', async () => {
      // Arrange
      const thumbnailFile = File.createNew(
        'tenant-1',
        'test.jpg',
        'image/jpeg',
        1024,
        fileType,
        'tenant-1/test.jpg',
        'user-1',
      );

      // Manually set thumbnail path
      (thumbnailFile as any)._props.thumbnailPath =
        'tenant-1/thumbnail/test.jpg';

      const fileId = thumbnailFile.id;
      const tenantId = 'tenant-1';
      const version = 'thumbnail';
      const presignedUrl = 'https://storage.example.com/signed-url';

      fileRepository.findById.mockResolvedValue(thumbnailFile);
      storageService.generatePresignedUrl.mockResolvedValue(presignedUrl);

      const command = new GetDownloadUrlCommand(
        fileId,
        tenantId,
        version,
        'user-1',
        undefined,
        '127.0.0.1',
        'test-agent',
      );

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(storageService.generatePresignedUrl).toHaveBeenCalledWith(
        thumbnailFile.thumbnailPath,
        900,
      );
      expect(result.fileName).toBe('thumbnail_test.jpg');
    });

    it('should fallback to original when thumbnail does not exist', async () => {
      // Arrange
      const fileId = mockFile.id;
      const tenantId = 'tenant-1';
      const version = 'thumbnail';
      const presignedUrl = 'https://storage.example.com/signed-url';

      fileRepository.findById.mockResolvedValue(mockFile);
      storageService.generatePresignedUrl.mockResolvedValue(presignedUrl);

      const command = new GetDownloadUrlCommand(
        fileId,
        tenantId,
        version,
        'user-1',
        undefined,
        '127.0.0.1',
        'test-agent',
      );

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(storageService.generatePresignedUrl).toHaveBeenCalledWith(
        mockFile.storagePath,
        900,
      );
      expect(result.fileName).toBe(mockFile.originalFileName);
    });

    it('should throw FileNotFoundException when file does not exist', async () => {
      // Arrange
      const fileId = 'non-existent-file-id';
      const tenantId = 'tenant-1';

      fileRepository.findById.mockResolvedValue(null);

      const command = new GetDownloadUrlCommand(
        fileId,
        tenantId,
        'original',
        'user-1',
        undefined,
        '127.0.0.1',
        'test-agent',
      );

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        FileNotFoundException,
      );
    });

    it('should throw FileNotFoundException when file belongs to different tenant', async () => {
      // Arrange
      const fileId = mockFile.id;
      const tenantId = 'different-tenant';

      fileRepository.findById.mockResolvedValue(mockFile);

      const command = new GetDownloadUrlCommand(
        fileId,
        tenantId,
        'original',
        'user-1',
        undefined,
        '127.0.0.1',
        'test-agent',
      );

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        FileNotFoundException,
      );
    });

    it('should set correct expiration time', async () => {
      // Arrange
      const fileId = mockFile.id;
      const tenantId = 'tenant-1';
      const presignedUrl = 'https://storage.example.com/signed-url';
      const now = new Date();

      fileRepository.findById.mockResolvedValue(mockFile);
      storageService.generatePresignedUrl.mockResolvedValue(presignedUrl);

      const command = new GetDownloadUrlCommand(
        fileId,
        tenantId,
        'original',
        'user-1',
        undefined,
        '127.0.0.1',
        'test-agent',
      );

      // Act
      const result = await handler.execute(command);

      // Assert
      const expectedExpiry = new Date(now.getTime() + 900 * 1000);
      const timeDiff = Math.abs(
        result.expiresAt.getTime() - expectedExpiry.getTime(),
      );
      expect(timeDiff).toBeLessThan(1000); // Allow 1 second tolerance
    });

    it('should include content ID in command', async () => {
      // Arrange
      const fileId = mockFile.id;
      const tenantId = 'tenant-1';
      const contentId = 'content-123';
      const presignedUrl = 'https://storage.example.com/signed-url';

      fileRepository.findById.mockResolvedValue(mockFile);
      storageService.generatePresignedUrl.mockResolvedValue(presignedUrl);

      const command = new GetDownloadUrlCommand(
        fileId,
        tenantId,
        'original',
        'user-1',
        contentId,
        '127.0.0.1',
        'test-agent',
      );

      // Act
      await handler.execute(command);

      // Assert
      expect(command.contentId).toBe(contentId);
    });
  });
});
