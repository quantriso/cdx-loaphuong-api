import { Test, TestingModule } from '@nestjs/testing';
import { PublishContentHandler } from '@modules/content/application/commands/handlers/publish-content.handler';
import { PublishContentCommand } from '@modules/content/application/commands/publish-content.command';
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

describe('PublishContentHandler', () => {
  let handler: PublishContentHandler;
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
        PublishContentHandler,
        {
          provide: CONTENT_REPOSITORY_TOKEN,
          useValue: mockRepository,
        },
      ],
    }).compile();

    handler = module.get<PublishContentHandler>(PublishContentHandler);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    const contentId = 'content-123';
    const tenantId = 'tenant-123';
    const adminId = 'admin-456';

    it('should publish APPROVED content successfully', async () => {
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

      mockRepository.getById.mockResolvedValue(content);

      const command = new PublishContentCommand(contentId, tenantId, adminId);

      // Act
      await handler.execute(command);

      // Assert
      expect(mockRepository.getById).toHaveBeenCalledWith(contentId);
      expect(mockRepository.save).toHaveBeenCalledWith(content);
      expect(content.status.isPublished()).toBe(true);
    });

    it('should throw NotFoundException if content not found', async () => {
      // Arrange
      mockRepository.getById.mockResolvedValue(null);

      const command = new PublishContentCommand(contentId, tenantId, adminId);

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

      const command = new PublishContentCommand(contentId, tenantId, adminId);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });
});
