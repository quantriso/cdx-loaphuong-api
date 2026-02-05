import { Test, TestingModule } from '@nestjs/testing';
import { RemoveVoteHandler } from 'src/modules/comment/application/commands/handlers/remove-vote.handler';
import { RemoveVoteCommand } from 'src/modules/comment/application/commands/remove-vote.command';
import { ICommentVoteRepository } from 'src/modules/comment/domain/repositories/comment-vote.repository.interface';
import { CommentRepositoryInterface } from 'src/modules/comment/domain/repositories/comment.repository.interface';
import { CommentId } from 'src/modules/comment/domain/value-objects/comment-id.value-object';
import { VoteType } from 'src/modules/comment/domain/value-objects/vote-type.enum';
import { CommentVote } from 'src/modules/comment/domain/entities/comment-vote.entity';
import {
  Comment,
  ModerationStatus,
} from 'src/modules/comment/domain/entities/comment.entity';
import { CommentContent } from 'src/modules/comment/domain/value-objects/comment-content.value-object';
import { VoteNotFoundException } from 'src/modules/comment/domain/exceptions/vote-not-found.exception';
import { COMMENT_VOTE_REPOSITORY_TOKEN } from 'src/modules/comment/constants/tokens';

describe('RemoveVoteHandler', () => {
  let handler: RemoveVoteHandler;
  let mockVoteRepository: jest.Mocked<ICommentVoteRepository>;
  let mockCommentRepository: jest.Mocked<CommentRepositoryInterface>;

  beforeEach(async () => {
    mockVoteRepository = {
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findById: jest.fn(),
      findByCommentAndUserId: jest.fn(),
      findByCommentId: jest.fn(),
      countByCommentIdAndType: jest.fn(),
      existsByCommentAndUserId: jest.fn(),
    } as unknown as jest.Mocked<ICommentVoteRepository>;

    mockCommentRepository = {
      save: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      getByCommentId: jest.fn(),
      getByAuthorId: jest.fn(),
      findByContentId: jest.fn(),
      findReplies: jest.fn(),
      findByAuthorId: jest.fn(),
      findByModerationStatus: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
      countByContentId: jest.fn(),
      incrementLikeCount: jest.fn(),
      decrementLikeCount: jest.fn(),
      incrementDislikeCount: jest.fn(),
      decrementDislikeCount: jest.fn(),
      findPaginated: jest.fn(),
      getById: jest.fn(),
    } as unknown as jest.Mocked<CommentRepositoryInterface>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemoveVoteHandler,
        {
          provide: COMMENT_VOTE_REPOSITORY_TOKEN,
          useValue: mockVoteRepository,
        },
        {
          provide: 'ICommentVoteRepository',
          useExisting: COMMENT_VOTE_REPOSITORY_TOKEN,
        },
        {
          provide: 'CommentRepositoryInterface',
          useValue: mockCommentRepository,
        },
      ],
    }).compile();

    handler = module.get<RemoveVoteHandler>(RemoveVoteHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should successfully remove a vote', async () => {
      // Arrange
      const command = new RemoveVoteCommand('comment-123', 'user-456');

      const existingVote = CommentVote.create(
        CommentId.fromString('comment-123'),
        'user-456',
        VoteType.LIKE,
      );

      const commentContent = CommentContent.create('Test comment');
      const mockComment = Comment.reconstitute({
        id: 'comment-123',
        contentId: 'content-456',
        authorId: 'author-789',
        content: commentContent,
        tenantId: 'tenant-1',
        moderationStatus: ModerationStatus.APPROVED,
        likeCount: 5,
        dislikeCount: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockVoteRepository.findByCommentAndUserId.mockResolvedValue(existingVote);
      mockVoteRepository.delete.mockResolvedValue(undefined);
      mockCommentRepository.decrementLikeCount.mockResolvedValue(undefined);
      mockCommentRepository.findById.mockResolvedValue(mockComment);

      // Act
      await handler.execute(command);

      // Assert
      expect(mockVoteRepository.findByCommentAndUserId).toHaveBeenCalledWith(
        CommentId.fromString('comment-123'),
        'user-456',
      );
      expect(mockVoteRepository.delete).toHaveBeenCalled();
      expect(mockCommentRepository.decrementLikeCount).toHaveBeenCalledWith(
        'comment-123',
      );
    });

    it('should throw VoteNotFoundException when user has not voted', async () => {
      // Arrange
      const command = new RemoveVoteCommand('comment-123', 'user-456');

      mockVoteRepository.findByCommentAndUserId.mockResolvedValue(null);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        VoteNotFoundException,
      );
    });

    it('should remove dislike vote', async () => {
      // Arrange
      const command = new RemoveVoteCommand('comment-123', 'user-456');

      const existingVote = CommentVote.create(
        CommentId.fromString('comment-123'),
        'user-456',
        VoteType.DISLIKE,
      );

      const commentContent = CommentContent.create('Test comment');
      const mockComment = Comment.reconstitute({
        id: 'comment-123',
        contentId: 'content-456',
        authorId: 'author-789',
        content: commentContent,
        tenantId: 'tenant-1',
        moderationStatus: ModerationStatus.APPROVED,
        likeCount: 5,
        dislikeCount: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockVoteRepository.findByCommentAndUserId.mockResolvedValue(existingVote);
      mockVoteRepository.delete.mockResolvedValue(undefined);
      mockCommentRepository.decrementDislikeCount.mockResolvedValue(undefined);
      mockCommentRepository.findById.mockResolvedValue(mockComment);

      // Act
      await handler.execute(command);

      // Assert
      expect(mockVoteRepository.findByCommentAndUserId).toHaveBeenCalledWith(
        CommentId.fromString('comment-123'),
        'user-456',
      );
      expect(mockVoteRepository.delete).toHaveBeenCalled();
      expect(mockCommentRepository.decrementDislikeCount).toHaveBeenCalledWith(
        'comment-123',
      );
    });
  });
});
