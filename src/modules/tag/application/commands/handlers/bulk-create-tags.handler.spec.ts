import { Test, TestingModule } from '@nestjs/testing';
import { BulkCreateTagsHandler } from './bulk-create-tags.handler';
import { BulkCreateTagsCommand } from '../bulk-create-tags.command';
import type { ITagRepository } from '../../../domain/repositories/tag.repository.interface';
import type {
  IUnitOfWork,
  ITransactionContext,
  IEventBus,
} from 'src/libs/core/infrastructure';
import { TAG_REPOSITORY_TOKEN } from '../../../constants/tokens';
import { EVENT_BUS_TOKEN } from 'src/libs/shared';
import { Tag, TagCategory } from '../../../domain/entities/tag.entity';
import { TagId } from '../../../domain/value-objects/tag-id.value-object';
import { DomainException } from 'src/libs/core/common';

describe('BulkCreateTagsHandler', () => {
  let handler: BulkCreateTagsHandler;
  let tagRepository: jest.Mocked<ITagRepository>;
  let unitOfWork: jest.Mocked<IUnitOfWork>;
  let eventBus: jest.Mocked<IEventBus>;

  const mockTransactionContext: ITransactionContext = {
    transaction: {},
    transactionId: 'test-transaction-id',
    isActive: true,
  };

  beforeEach(async () => {
    // Mock repository
    tagRepository = {
      findBySlug: jest.fn(),
      save: jest.fn(),
      existsBySlug: jest.fn(),
      findActiveTags: jest.fn(),
      countByTenantId: jest.fn(),
    } as any;

    // Mock Unit of Work
    unitOfWork = {
      runInTransaction: jest.fn((work) => work(mockTransactionContext)),
    } as any;

    // Mock Event Bus
    eventBus = {
      publish: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BulkCreateTagsHandler,
        {
          provide: TAG_REPOSITORY_TOKEN,
          useValue: tagRepository,
        },
        {
          provide: 'IUnitOfWork',
          useValue: unitOfWork,
        },
        {
          provide: EVENT_BUS_TOKEN,
          useValue: eventBus,
        },
      ],
    }).compile();

    handler = module.get<BulkCreateTagsHandler>(BulkCreateTagsHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should create all tags successfully when no duplicates exist', async () => {
      // Arrange
      const command = new BulkCreateTagsCommand(
        [
          {
            name: 'Covid-19',
            color: '#FF9900',
            category: 'HEALTH',
            synonyms: ['coronavirus'],
          },
          {
            name: 'Vaccination',
            color: '#00FF00',
            category: 'HEALTH',
            synonyms: ['vaccine'],
          },
        ],
        'tenant-1',
        'user-1',
      );

      tagRepository.findBySlug.mockResolvedValue(null); // No duplicates

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.created).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.skippedTags).toEqual([]);
      expect(result.failedTags).toEqual([]);
      expect(tagRepository.save).toHaveBeenCalledTimes(2);
      expect(unitOfWork.runInTransaction).toHaveBeenCalledTimes(1);
    });

    it('should skip duplicate tags and create only new ones', async () => {
      // Arrange
      const command = new BulkCreateTagsCommand(
        [
          {
            name: 'Covid-19',
            color: '#FF9900',
            category: 'HEALTH',
          },
          {
            name: 'Vaccination',
            color: '#00FF00',
            category: 'HEALTH',
          },
        ],
        'tenant-1',
        'user-1',
      );

      // Mock first tag exists, second doesn't
      tagRepository.findBySlug
        .mockResolvedValueOnce({} as Tag) // Covid-19 exists
        .mockResolvedValueOnce(null); // Vaccination doesn't exist

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.created).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.skippedTags).toHaveLength(1);
      expect(result.skippedTags![0].name).toBe('Covid-19');
      expect(result.skippedTags![0].reason).toContain('already exists');
      expect(tagRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should handle validation errors and continue with valid tags', async () => {
      // Arrange
      const command = new BulkCreateTagsCommand(
        [
          {
            name: 'Valid Tag',
            color: '#FF9900',
            category: 'HEALTH',
          },
          {
            name: '', // Invalid: empty name
            color: '#00FF00',
            category: 'HEALTH',
          },
        ],
        'tenant-1',
        'user-1',
      );

      tagRepository.findBySlug.mockResolvedValue(null);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.created).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.failedTags).toHaveLength(1);
      expect(result.failedTags![0].name).toBe('');
      expect(result.failedTags![0].reason).toBeTruthy();
    });

    it('should handle repository save failures gracefully', async () => {
      // Arrange
      const command = new BulkCreateTagsCommand(
        [
          {
            name: 'Tag 1',
            color: '#FF9900',
            category: 'HEALTH',
          },
          {
            name: 'Tag 2',
            color: '#00FF00',
            category: 'HEALTH',
          },
        ],
        'tenant-1',
        'user-1',
      );

      tagRepository.findBySlug.mockResolvedValue(null);
      tagRepository.save
        .mockResolvedValueOnce() // First save succeeds
        .mockRejectedValueOnce(new Error('Database error')); // Second save fails

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.created).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.failedTags).toHaveLength(1);
      expect(result.failedTags![0].reason).toBe('Database error');
    });

    it('should use transaction for all operations', async () => {
      // Arrange
      const command = new BulkCreateTagsCommand(
        [
          {
            name: 'Tag 1',
            color: '#FF9900',
          },
        ],
        'tenant-1',
        'user-1',
      );

      tagRepository.findBySlug.mockResolvedValue(null);

      // Act
      await handler.execute(command);

      // Assert
      expect(unitOfWork.runInTransaction).toHaveBeenCalledTimes(1);
      expect(tagRepository.save).toHaveBeenCalledWith(
        expect.any(Tag),
        mockTransactionContext,
      );
    });

    it('should apply default category if not provided', async () => {
      // Arrange
      const command = new BulkCreateTagsCommand(
        [
          {
            name: 'General Tag',
            color: '#FF9900',
            // No category provided
          },
        ],
        'tenant-1',
        'user-1',
      );

      tagRepository.findBySlug.mockResolvedValue(null);

      let savedTag: Tag | undefined;
      tagRepository.save.mockImplementation(async (tag) => {
        savedTag = tag;
      });

      // Act
      await handler.execute(command);

      // Assert
      expect(savedTag).toBeDefined();
      expect(savedTag!.category).toBe(TagCategory.GENERAL);
    });

    it('should handle optional synonyms correctly', async () => {
      // Arrange
      const command = new BulkCreateTagsCommand(
        [
          {
            name: 'Tag with Synonyms',
            color: '#FF9900',
            category: 'HEALTH',
            synonyms: ['synonym1', 'synonym2'],
          },
          {
            name: 'Tag without Synonyms',
            color: '#00FF00',
            category: 'HEALTH',
            // No synonyms
          },
        ],
        'tenant-1',
        'user-1',
      );

      tagRepository.findBySlug.mockResolvedValue(null);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.created).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('should return summary with correct counts', async () => {
      // Arrange
      const command = new BulkCreateTagsCommand(
        [
          { name: 'New Tag 1', color: '#FF9900' },
          { name: 'Duplicate Tag', color: '#00FF00' },
          { name: '', color: '#0000FF' }, // Invalid
          { name: 'New Tag 2', color: '#FFFF00' },
        ],
        'tenant-1',
        'user-1',
      );

      tagRepository.findBySlug
        .mockResolvedValueOnce(null) // New Tag 1 - OK
        .mockResolvedValueOnce({} as Tag) // Duplicate Tag - Skip
        .mockResolvedValueOnce(null) // Invalid Tag - will fail validation
        .mockResolvedValueOnce(null); // New Tag 2 - OK

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.created).toBe(2); // New Tag 1 + New Tag 2
      expect(result.skipped).toBe(1); // Duplicate Tag
      expect(result.failed).toBe(1); // Invalid Tag
      expect(result.created + result.skipped + result.failed).toBe(4);
    });
  });
});
