import { CreateCommentHandler } from '@modules/comment/application/commands/handlers/create-comment.handler';
import { CreateCommentCommand } from '@modules/comment/application/commands/create-comment.command';
import type { CommentRepositoryInterface } from '@modules/comment/domain/repositories/comment.repository.interface';
import { ContentService } from '@modules/comment/domain/services/content.service';
import { ContentAvailabilityService } from '@modules/comment/domain/services/content-availability.service';
import { ThreadService } from '@modules/comment/domain/services/thread.service';
import { Comment } from '@modules/comment/domain/entities/comment.entity';
import { CommentId } from '@modules/comment/domain/value-objects/comment-id.value-object';
import { CommentContent } from '@modules/comment/domain/value-objects/comment-content.value-object';
import { CommentNotFoundException } from '@modules/comment/domain/exceptions/comment-not-found.exception';
import { RateLimitExceededException } from '@modules/comment/domain/exceptions/rate-limit-exceeded.exception';
import { randomUUID } from 'crypto';

describe('CreateCommentHandler', () => {
  let handler: CreateCommentHandler;
  let mockCommentRepository: any;
  let mockContentService: any;
  let mockContentAvailabilityService: any;
  let mockThreadService: any;

  beforeEach(() => {
    mockCommentRepository = {
      findById: jest.fn(),
      save: jest.fn(),
    };

    mockContentService = {
      checkRateLimit: jest.fn(),
    };

    mockContentAvailabilityService = {
      ensureContentIsPublished: jest.fn(),
    };

    mockThreadService = {
      calculateThreadDepth: jest.fn(),
      findRootCommentId: jest.fn(),
    };

    handler = new CreateCommentHandler(
      mockCommentRepository,
      mockContentService,
      mockContentAvailabilityService,
      mockThreadService,
    );
  });

  describe('Story 6.2: Reply to comment', () => {
    it('should create a reply to a root comment', async () => {
      // Arrange
      const contentId = 'content-1';
      const authorId = 'user-1';
      const tenantId = 'tenant-1';
      const parentCommentId = randomUUID();
      const replyContent = 'This is a reply to the comment';

      const command = new CreateCommentCommand(
        contentId,
        authorId,
        replyContent,
        tenantId,
        parentCommentId,
        [],
      );

      const parentComment = Comment.create(
        contentId,
        'user-2',
        CommentContent.create('Parent comment'),
        tenantId,
        undefined, // Root comment has no parent
        undefined,
      );

      Object.assign(parentComment, {
        _props: {
          ...parentComment['_props'],
          id: parentCommentId,
        },
      });

      mockContentAvailabilityService.ensureContentIsPublished.mockResolvedValue(
        undefined,
      );
      mockContentService.checkRateLimit.mockResolvedValue(false);
      mockCommentRepository.findById.mockResolvedValue(parentComment);
      mockThreadService.calculateThreadDepth.mockResolvedValue(0); // Root comment depth
      mockCommentRepository.save.mockResolvedValue(undefined);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(
        mockContentAvailabilityService.ensureContentIsPublished,
      ).toHaveBeenCalledWith(contentId, tenantId);
      expect(mockContentService.checkRateLimit).toHaveBeenCalledWith(
        authorId,
        tenantId,
      );
      expect(mockCommentRepository.findById).toHaveBeenCalledWith(
        CommentId.fromString(parentCommentId),
      );
      expect(mockThreadService.calculateThreadDepth).toHaveBeenCalledWith(
        CommentId.fromString(parentCommentId),
      );
      expect(mockCommentRepository.save).toHaveBeenCalled();
    });

    it('should create a reply to a reply (nested reply)', async () => {
      // Arrange
      const contentId = 'content-1';
      const authorId = 'user-1';
      const tenantId = 'tenant-1';
      const rootCommentId = randomUUID();
      const parentCommentId = randomUUID();
      const replyContent = 'This is a nested reply';

      const command = new CreateCommentCommand(
        contentId,
        authorId,
        replyContent,
        tenantId,
        parentCommentId,
        [],
      );

      const parentComment = Comment.create(
        contentId,
        'user-2',
        CommentContent.create('Parent reply'),
        tenantId,
        rootCommentId, // This is a reply to another comment
        undefined,
      );

      Object.assign(parentComment, {
        _props: {
          ...parentComment['_props'],
          id: parentCommentId,
        },
      });

      mockContentAvailabilityService.ensureContentIsPublished.mockResolvedValue(
        undefined,
      );
      mockContentService.checkRateLimit.mockResolvedValue(false);
      mockCommentRepository.findById.mockResolvedValue(parentComment);
      mockThreadService.calculateThreadDepth.mockResolvedValue(1); // First-level reply
      mockThreadService.findRootCommentId.mockResolvedValue(rootCommentId);
      mockCommentRepository.save.mockResolvedValue(undefined);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result).toBeDefined();
      expect(mockCommentRepository.findById).toHaveBeenCalledWith(
        CommentId.fromString(parentCommentId),
      );
      expect(mockThreadService.calculateThreadDepth).toHaveBeenCalledWith(
        CommentId.fromString(parentCommentId),
      );
      expect(mockThreadService.findRootCommentId).toHaveBeenCalledWith(
        parentCommentId,
      );
    });

    it('should throw CommentNotFoundException when parent comment does not exist', async () => {
      // Arrange
      const contentId = 'content-1';
      const authorId = 'user-1';
      const tenantId = 'tenant-1';
      const parentCommentId = randomUUID();
      const replyContent = 'This is a reply';

      const command = new CreateCommentCommand(
        contentId,
        authorId,
        replyContent,
        tenantId,
        parentCommentId,
        [],
      );

      mockContentAvailabilityService.ensureContentIsPublished.mockResolvedValue(
        undefined,
      );
      mockContentService.checkRateLimit.mockResolvedValue(false);
      mockCommentRepository.findById.mockResolvedValue(null); // Parent not found

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        CommentNotFoundException,
      );
      await expect(handler.execute(command)).rejects.toThrow(
        'Parent comment not found',
      );
    });

    it('should throw error when maximum thread depth is exceeded', async () => {
      // Arrange
      const contentId = 'content-1';
      const authorId = 'user-1';
      const tenantId = 'tenant-1';
      const parentCommentId = randomUUID();
      const replyContent = 'This is a reply';

      const command = new CreateCommentCommand(
        contentId,
        authorId,
        replyContent,
        tenantId,
        parentCommentId,
        [],
      );

      const parentComment = Comment.create(
        contentId,
        'user-2',
        CommentContent.create('Parent reply'),
        tenantId,
        'some-root-id',
        undefined,
      );

      Object.assign(parentComment, {
        _props: {
          ...parentComment['_props'],
          id: parentCommentId,
        },
      });

      mockContentAvailabilityService.ensureContentIsPublished.mockResolvedValue(
        undefined,
      );
      mockContentService.checkRateLimit.mockResolvedValue(false);
      mockCommentRepository.findById.mockResolvedValue(parentComment);
      mockThreadService.calculateThreadDepth.mockResolvedValue(3); // Max depth reached

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        'Maximum thread depth exceeded (3 levels)',
      );
    });

    it('should create root comment (no parent)', async () => {
      // Arrange
      const contentId = 'content-1';
      const authorId = 'user-1';
      const tenantId = 'tenant-1';
      const commentContent = 'This is a root comment';

      const command = new CreateCommentCommand(
        contentId,
        authorId,
        commentContent,
        tenantId,
        undefined, // No parent
        [],
      );

      mockContentAvailabilityService.ensureContentIsPublished.mockResolvedValue(
        undefined,
      );
      mockContentService.checkRateLimit.mockResolvedValue(false);
      mockCommentRepository.save.mockResolvedValue(undefined);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result).toBeDefined();
      expect(mockCommentRepository.findById).not.toHaveBeenCalled();
      expect(mockThreadService.calculateThreadDepth).not.toHaveBeenCalled();
      expect(mockThreadService.findRootCommentId).not.toHaveBeenCalled();
      expect(mockCommentRepository.save).toHaveBeenCalled();
    });

    it('should throw RateLimitExceededException when rate limit is exceeded', async () => {
      // Arrange
      const contentId = 'content-1';
      const authorId = 'user-1';
      const tenantId = 'tenant-1';
      const commentContent = 'This is a comment';

      const command = new CreateCommentCommand(
        contentId,
        authorId,
        commentContent,
        tenantId,
        undefined,
        [],
      );

      mockContentAvailabilityService.ensureContentIsPublished.mockResolvedValue(
        undefined,
      );
      mockContentService.checkRateLimit.mockResolvedValue(true); // Rate limited

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        RateLimitExceededException,
      );
    });

    it('should handle mentions in comment content', async () => {
      // Arrange
      const contentId = 'content-1';
      const authorId = 'user-1';
      const tenantId = 'tenant-1';
      const commentContent = 'Hello @user-2 and @user-3!';
      const mentions = ['user-2', 'user-3'];

      const command = new CreateCommentCommand(
        contentId,
        authorId,
        commentContent,
        tenantId,
        undefined,
        mentions,
      );

      mockContentAvailabilityService.ensureContentIsPublished.mockResolvedValue(
        undefined,
      );
      mockContentService.checkRateLimit.mockResolvedValue(false);
      mockCommentRepository.save.mockResolvedValue(undefined);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result).toBeDefined();
      expect(mockCommentRepository.save).toHaveBeenCalled();
      // Verify that comment entity was created with mentions
      const saveCall = mockCommentRepository.save.mock.calls[0][0] as Comment;
      expect(saveCall.mentions).toEqual(mentions);
    });

    it('should find root comment when replying to a nested comment', async () => {
      // Arrange
      const contentId = 'content-1';
      const authorId = 'user-1';
      const tenantId = 'tenant-1';
      const rootCommentId = randomUUID();
      const parentCommentId = randomUUID();
      const replyContent = 'Reply to nested comment';

      const command = new CreateCommentCommand(
        contentId,
        authorId,
        replyContent,
        tenantId,
        parentCommentId,
        [],
      );

      const parentComment = Comment.create(
        contentId,
        'user-2',
        CommentContent.create('Parent reply'),
        tenantId,
        rootCommentId,
        undefined,
      );

      Object.assign(parentComment, {
        _props: {
          ...parentComment['_props'],
          id: parentCommentId,
        },
      });

      mockContentAvailabilityService.ensureContentIsPublished.mockResolvedValue(
        undefined,
      );
      mockContentService.checkRateLimit.mockResolvedValue(false);
      mockCommentRepository.findById.mockResolvedValue(parentComment);
      mockThreadService.calculateThreadDepth.mockResolvedValue(1);
      mockThreadService.findRootCommentId.mockResolvedValue(rootCommentId);
      mockCommentRepository.save.mockResolvedValue(undefined);

      // Act
      await handler.execute(command);

      // Assert
      expect(mockThreadService.findRootCommentId).toHaveBeenCalledWith(
        parentCommentId,
      );
    });

    it('should not call findRootCommentId when replying to root comment', async () => {
      // Arrange
      const contentId = 'content-1';
      const authorId = 'user-1';
      const tenantId = 'tenant-1';
      const rootCommentId = randomUUID();
      const replyContent = 'Reply to root comment';

      const command = new CreateCommentCommand(
        contentId,
        authorId,
        replyContent,
        tenantId,
        rootCommentId,
        [],
      );

      const parentComment = Comment.create(
        contentId,
        'user-2',
        CommentContent.create('Root comment'),
        tenantId,
        undefined, // No parent - this is a root comment
        undefined,
      );

      Object.assign(parentComment, {
        _props: {
          ...parentComment['_props'],
          id: rootCommentId,
        },
      });

      mockContentAvailabilityService.ensureContentIsPublished.mockResolvedValue(
        undefined,
      );
      mockContentService.checkRateLimit.mockResolvedValue(false);
      mockCommentRepository.findById.mockResolvedValue(parentComment);
      mockThreadService.calculateThreadDepth.mockResolvedValue(0);
      mockCommentRepository.save.mockResolvedValue(undefined);

      // Act
      await handler.execute(command);

      // Assert
      expect(mockThreadService.findRootCommentId).not.toHaveBeenCalled();
    });
  });
});
