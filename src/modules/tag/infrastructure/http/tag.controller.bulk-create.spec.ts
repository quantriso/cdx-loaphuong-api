import { Test, TestingModule } from '@nestjs/testing';
import { TagController } from './tag.controller';
import type { ICommandBus } from 'src/libs/core/application';
import { COMMAND_BUS_TOKEN, QUERY_BUS_TOKEN } from 'src/libs/core/constants';
import {
  BulkCreateTagsDto,
  BulkCreateTagItemDto,
} from '../../application/dtos';
import { BulkCreateTagsCommand } from '../../application/commands';

describe('TagController - Bulk Create Integration', () => {
  let controller: TagController;
  let commandBus: jest.Mocked<ICommandBus>;

  beforeEach(async () => {
    commandBus = {
      execute: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TagController],
      providers: [
        {
          provide: COMMAND_BUS_TOKEN,
          useValue: commandBus,
        },
        {
          provide: QUERY_BUS_TOKEN,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<TagController>(TagController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/tags/bulk-create', () => {
    it('should create multiple tags successfully', async () => {
      // Arrange
      const dto: BulkCreateTagsDto = {
        tags: [
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
          },
        ],
      };

      const mockResponse = {
        created: 2,
        skipped: 0,
        failed: 0,
        skippedTags: [],
        failedTags: [],
      };

      commandBus.execute.mockResolvedValue(mockResponse);

      const req = {
        user: {
          tenantId: 'tenant-1',
          id: 'user-1',
          role: 'EDITOR',
        },
      };

      // Act
      const result = await controller.bulkCreateTags(dto, req);

      // Assert
      expect(result).toEqual(mockResponse);
      expect(commandBus.execute).toHaveBeenCalledTimes(1);
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: dto.tags,
          tenantId: 'tenant-1',
          userId: 'user-1',
        }),
      );
    });

    it('should handle partial success with skipped tags', async () => {
      // Arrange
      const dto: BulkCreateTagsDto = {
        tags: [
          {
            name: 'New Tag',
            color: '#FF9900',
          },
          {
            name: 'Existing Tag',
            color: '#00FF00',
          },
        ],
      };

      const mockResponse = {
        created: 1,
        skipped: 1,
        failed: 0,
        skippedTags: [
          {
            name: 'Existing Tag',
            reason: 'Tag already exists',
          },
        ],
        failedTags: [],
      };

      commandBus.execute.mockResolvedValue(mockResponse);

      const req = {
        user: {
          tenantId: 'tenant-1',
          id: 'user-1',
        },
      };

      // Act
      const result = await controller.bulkCreateTags(dto, req);

      // Assert
      expect(result.created).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.skippedTags).toHaveLength(1);
    });

    it('should handle partial success with failed tags', async () => {
      // Arrange
      const dto: BulkCreateTagsDto = {
        tags: [
          {
            name: 'Valid Tag',
            color: '#FF9900',
          },
          {
            name: '', // Invalid
            color: '#00FF00',
          },
        ],
      };

      const mockResponse = {
        created: 1,
        skipped: 0,
        failed: 1,
        skippedTags: [],
        failedTags: [
          {
            name: '',
            reason: 'Tag name is required',
          },
        ],
      };

      commandBus.execute.mockResolvedValue(mockResponse);

      const req = {
        user: {
          tenantId: 'tenant-1',
          id: 'user-1',
        },
      };

      // Act
      const result = await controller.bulkCreateTags(dto, req);

      // Assert
      expect(result.created).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.failedTags).toHaveLength(1);
    });

    it('should use mock tenant and user when not provided in request', async () => {
      // Arrange
      const dto: BulkCreateTagsDto = {
        tags: [
          {
            name: 'Test Tag',
            color: '#FF9900',
          },
        ],
      };

      const mockResponse = {
        created: 1,
        skipped: 0,
        failed: 0,
        skippedTags: [],
        failedTags: [],
      };

      commandBus.execute.mockResolvedValue(mockResponse);

      const req = {}; // No user in request

      // Act
      await controller.bulkCreateTags(dto, req);

      // Assert
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'mock-tenant-id',
          userId: 'mock-admin-id',
        }),
      );
    });

    it('should pass command to command bus correctly', async () => {
      // Arrange
      const dto: BulkCreateTagsDto = {
        tags: [
          {
            name: 'Tag 1',
            color: '#FF9900',
            category: 'GENERAL',
            synonyms: ['tag1', 'tagone'],
          },
        ],
      };

      commandBus.execute.mockResolvedValue({
        created: 1,
        skipped: 0,
        failed: 0,
      });

      const req = {
        user: {
          tenantId: 'tenant-123',
          id: 'user-456',
        },
      };

      // Act
      await controller.bulkCreateTags(dto, req);

      // Assert
      const executedCommand = commandBus.execute.mock.calls[0][0] as BulkCreateTagsCommand;
      expect(executedCommand).toBeInstanceOf(BulkCreateTagsCommand);
      expect(executedCommand.tags).toEqual(dto.tags);
      expect(executedCommand.tenantId).toBe('tenant-123');
      expect(executedCommand.userId).toBe('user-456');
    });
  });
});
