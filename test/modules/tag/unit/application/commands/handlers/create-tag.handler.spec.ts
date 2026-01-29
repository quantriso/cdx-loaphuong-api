import { Test, TestingModule } from '@nestjs/testing';
import { CreateTagHandler } from '../../../../../../../src/modules/tag/application/commands/handlers/create-tag.handler';
import { CreateTagCommand } from '../../../../../../../src/modules/tag/application/commands/create-tag.command';
import { ITagRepository } from '../../../../../../../src/modules/tag/domain/repositories';
import { TAG_REPOSITORY_TOKEN } from '../../../../../../../src/modules/tag/constants/tokens';
import { ConflictException } from '@core/common';
import { Tag, TagId, TagCategory } from '../../../../../../../src/modules/tag/domain';

describe('CreateTagHandler', () => {
  let handler: CreateTagHandler;
  let tagRepository: jest.Mocked<ITagRepository>;

  beforeEach(async () => {
    // Create mock repository
    const mockRepository: Partial<ITagRepository> = {
      findBySlug: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateTagHandler,
        {
          provide: TAG_REPOSITORY_TOKEN,
          useValue: mockRepository,
        },
      ],
    }).compile();

    handler = module.get<CreateTagHandler>(CreateTagHandler);
    tagRepository = module.get(TAG_REPOSITORY_TOKEN);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should create a new tag successfully', async () => {
      // Arrange
      const command = new CreateTagCommand(
        'tenant-123',
        'Emergency',
        TagCategory.EMERGENCY,
        'Critical notifications',
        '#FF0000',
        ['urgent', 'critical'],
        { priority: 'high' },
        'admin-123',
      );

      tagRepository.findBySlug.mockResolvedValue(null);
      tagRepository.save.mockImplementation(async (tag) => tag);

      // Act
      const tagId = await handler.execute(command);

      // Assert
      expect(tagId).toBeDefined();
      expect(tagId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(tagRepository.findBySlug).toHaveBeenCalledWith(
        'tenant-123',
        'emergency',
      );
      expect(tagRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Emergency',
          slug: 'emergency',
          tenantId: 'tenant-123',
          category: TagCategory.EMERGENCY,
          synonyms: ['urgent', 'critical'],
        }),
      );
    });

    it('should create tag with minimal fields', async () => {
      // Arrange
      const command = new CreateTagCommand(
        'tenant-123',
        'Services',
        TagCategory.SERVICES,
        undefined,
        undefined,
        undefined,
        undefined,
        'admin-123',
      );

      tagRepository.findBySlug.mockResolvedValue(null);
      tagRepository.save.mockImplementation(async (tag) => tag);

      // Act
      const tagId = await handler.execute(command);

      // Assert
      expect(tagId).toBeDefined();
      expect(tagRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Services',
          slug: 'services',
          category: TagCategory.SERVICES,
          synonyms: [],
          usageCount: 0,
          description: undefined,
          color: undefined,
        }),
      );
    });

    it('should throw ConflictException when tag slug already exists', async () => {
      // Arrange
      const command = new CreateTagCommand(
        'tenant-123',
        'Emergency',
        TagCategory.EMERGENCY,
        'Critical notifications',
        '#FF0000',
        undefined,
        undefined,
        'admin-123',
      );

      const existingTag = Tag.create(
        TagId.generate(),
        {
          tenantId: 'tenant-123',
          name: 'Emergency',
          slug: 'emergency',
          category: TagCategory.EMERGENCY,
          synonyms: [],
          isActive: true,
          usageCount: 0,
        },
        'admin-123',
      );

      tagRepository.findBySlug.mockResolvedValue(existingTag);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        ConflictException,
      );
      await expect(handler.execute(command)).rejects.toThrow(
        "Tag with name 'Emergency' already exists",
      );
      expect(tagRepository.save).not.toHaveBeenCalled();
    });

    it('should generate slug from name correctly', async () => {
      // Arrange
      const command = new CreateTagCommand(
        'tenant-123',
        'Emergency Alert System',
        TagCategory.EMERGENCY,
        undefined,
        undefined,
        undefined,
        undefined,
        'admin-123',
      );

      tagRepository.findBySlug.mockResolvedValue(null);
      tagRepository.save.mockImplementation(async (tag) => tag);

      // Act
      await handler.execute(command);

      // Assert
      expect(tagRepository.findBySlug).toHaveBeenCalledWith(
        'tenant-123',
        'emergency-alert-system',
      );
      expect(tagRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'emergency-alert-system',
        }),
      );
    });

    it('should handle special characters in tag name', async () => {
      // Arrange
      const command = new CreateTagCommand(
        'tenant-123',
        'COVID-19 Updates!',
        TagCategory.ANNOUNCEMENTS,
        undefined,
        undefined,
        undefined,
        undefined,
        'admin-123',
      );

      tagRepository.findBySlug.mockResolvedValue(null);
      tagRepository.save.mockImplementation(async (tag) => tag);

      // Act
      await handler.execute(command);

      // Assert
      expect(tagRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'covid-19-updates',
        }),
      );
    });
  });
});
