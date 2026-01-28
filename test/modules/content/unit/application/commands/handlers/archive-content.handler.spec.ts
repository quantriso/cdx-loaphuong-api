import { Test, TestingModule } from '@nestjs/testing';
import { ArchiveContentHandler } from '@modules/content/application/commands/handlers/archive-content.handler';
import { ArchiveContentCommand } from '@modules/content/application/commands/archive-content.command';
import { IContentRepository } from '@modules/content/domain/repositories';
import { CONTENT_REPOSITORY_TOKEN } from '@modules/content/constants/tokens';
import { Content } from '@modules/content/domain/entities';
import {
  ContentId,
  ContentStatus,
  ContentType,
  ContentPriority,
} from '@modules/content/domain/value-objects';
import { NotFoundException } from '@core/common';

describe('ArchiveContentHandler', () => {
  let handler: ArchiveContentHandler;
  let mockRepository: jest.Mocked<IContentRepository>;

  beforeEach(async () => {
    mockRepository = {
      getById: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      existsById: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArchiveContentHandler,
        {
          provide: CONTENT_REPOSITORY_TOKEN,
          useValue: mockRepository,
        },
      ],
    }).compile();

    handler = module.get<ArchiveContentHandler>(ArchiveContentHandler);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    const contentId = 'content-123';
    const tenantId = 'tenant-123';
    const adminId = 'admin-456';

    it('should archive PUBLISHED content successfully', async () => {
      // Arrange
      const content = Content.create(new ContentId(contentId), {
        tenantId,
        authorId: 'author-789',
        title: 'Test Content',
        content: 'Test content body',
        excerpt: 'Test excerpt',
        type: ContentType.article(),
        priority: ContentPriority.medium(),
      });

      // Submit for approval to get PENDING status
      content.submitForApproval();

      // Approve to get APPROVED status
      content.approve(adminId);

      // Publish to get PUBLISHED status
      content.publish(adminId);

      mockRepository.getById.mockResolvedValue(content);

      const command = new ArchiveContentCommand(contentId, tenantId, adminId);

      // Act
      await handler.execute(command);

      // Assert
      expect(mockRepository.getById).toHaveBeenCalledWith(contentId);
      expect(mockRepository.save).toHaveBeenCalledWith(content);
      expect(content.status.isArchived()).toBe(true);
    });

    it('should throw NotFoundException if content not found', async () => {
      // Arrange
      mockRepository.getById.mockResolvedValue(null);

      const command = new ArchiveContentCommand(contentId, tenantId, adminId);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if content belongs to different tenant', async () => {
      // Arrange
      const content = Content.create(new ContentId(contentId), {
        tenantId: 'different-tenant',
        authorId: 'author-789',
        title: 'Test Content',
        content: 'Test content body',
        type: ContentType.article(),
      });

      mockRepository.getById.mockResolvedValue(content);

      const command = new ArchiveContentCommand(contentId, tenantId, adminId);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should throw error if content is not in PUBLISHED status', async () => {
      // Arrange
      const content = Content.create(new ContentId(contentId), {
        tenantId,
        authorId: 'author-789',
        title: 'Test Content',
        content: 'Test content body',
        type: ContentType.article(),
      });

      // Content is in DRAFT status, not PUBLISHED
      mockRepository.getById.mockResolvedValue(content);

      const command = new ArchiveContentCommand(contentId, tenantId, adminId);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should call save with correct content aggregate', async () => {
      // Arrange
      const content = Content.create(new ContentId(contentId), {
        tenantId,
        authorId: 'author-789',
        title: 'Test Content',
        content: 'Test content body',
        type: ContentType.article(),
      });

      // Transition to PUBLISHED
      content.submitForApproval();
      content.approve(adminId);
      content.publish(adminId);

      mockRepository.getById.mockResolvedValue(content);
      mockRepository.save.mockResolvedValue(content);

      const command = new ArchiveContentCommand(contentId, tenantId, adminId);

      // Act
      await handler.execute(command);

      // Assert
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
      expect(mockRepository.save).toHaveBeenCalledWith(content);
    });
  });
});
