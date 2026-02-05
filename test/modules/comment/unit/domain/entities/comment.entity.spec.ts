import { describe, it, expect } from '@jest/globals';
import {
  Comment,
  ModerationStatus,
} from 'src/modules/comment/domain/entities/comment.entity';
import { CommentId } from 'src/modules/comment/domain/value-objects/comment-id.value-object';
import { CommentContent } from 'src/modules/comment/domain/value-objects/comment-content.value-object';
import { CommentNotFoundException } from 'src/modules/comment/domain/exceptions/comment-not-found.exception';
import { CommentLengthExceededException } from 'src/modules/comment/domain/exceptions/comment-length-exceeded.exception';

describe('Comment Entity', () => {
  const validContent = 'This is a valid comment';
  const contentId = 'content-123';
  const authorId = 'user-456';
  const tenantId = 'tenant-789';

  describe('Creation', () => {
    it('should create a valid root comment', () => {
      const commentContent = CommentContent.create(validContent);
      const comment = Comment.create(
        contentId,
        authorId,
        commentContent,
        tenantId,
      );

      expect(comment.commentId).toBeDefined();
      expect(comment.content.value).toBe(validContent);
      expect(comment.contentId).toBe(contentId);
      expect(comment.authorId).toBe(authorId);
      expect(comment.tenantId).toBe(tenantId);
      expect(comment.parentCommentId).toBeUndefined();
      expect(comment.moderationStatus).toBe('PENDING');
      expect(comment.commentCreatedAt).toBeInstanceOf(Date);
      expect(comment.commentUpdatedAt).toBeInstanceOf(Date);
    });

    it('should create a valid reply comment', () => {
      const parentCommentId = 'parent-123';
      const commentContent = CommentContent.create(validContent);
      const comment = Comment.create(
        contentId,
        authorId,
        commentContent,
        tenantId,
        parentCommentId,
      );

      expect(comment.parentCommentId).toBe(parentCommentId);
    });

    it('should create a comment with mentions', () => {
      const mentions = ['user1', 'user2'];
      const commentContent = CommentContent.create(validContent, mentions);
      const comment = Comment.create(
        contentId,
        authorId,
        commentContent,
        tenantId,
        undefined,
        mentions,
      );

      expect(comment.mentions).toEqual(mentions);
    });

    it('should throw error for content exceeding maximum length', () => {
      const longContent = 'x'.repeat(5001);

      expect(() => {
        CommentContent.create(longContent);
      }).toThrow(CommentLengthExceededException);
    });

    it('should throw error for empty content', () => {
      expect(() => {
        CommentContent.create('');
      }).toThrow(CommentLengthExceededException);
    });

    it('should throw error for whitespace-only content', () => {
      expect(() => {
        CommentContent.create('   ');
      }).toThrow(CommentLengthExceededException);
    });
  });

  describe('Reconstruction', () => {
    it('should reconstruct comment from persistence', () => {
      const commentId = CommentId.generate();
      const content = CommentContent.create(validContent);
      const parentCommentId = 'parent-123';
      const mentions = ['user1'];
      const moderationStatus = ModerationStatus.APPROVED;
      const createdAt = new Date('2024-01-01');
      const updatedAt = new Date('2024-01-02');

      const comment = Comment.reconstitute({
        id: commentId.value,
        contentId,
        authorId,
        tenantId,
        content,
        parentCommentId,
        moderationStatus,
        mentions,
        likeCount: 0,
        dislikeCount: 0,
        createdAt,
        updatedAt,
      });

      expect(comment.commentId).toBe(commentId.value);
      expect(comment.content.value).toBe(validContent);
      expect(comment.parentCommentId).toBe(parentCommentId);
      expect(comment.moderationStatus).toBe(moderationStatus);
      expect(comment.mentions).toEqual(mentions);
      expect(comment.commentCreatedAt).toEqual(createdAt);
      expect(comment.commentUpdatedAt).toEqual(updatedAt);
    });
  });

  describe('Moderation', () => {
    it('should approve comment', () => {
      const commentContent = CommentContent.create(validContent);
      const comment = Comment.create(
        contentId,
        authorId,
        commentContent,
        tenantId,
      );
      const beforeStatus = comment.moderationStatus;

      comment.approve();

      expect(beforeStatus).toBe(ModerationStatus.PENDING);
      expect(comment.moderationStatus).toBe(ModerationStatus.APPROVED);
      expect(comment.commentUpdatedAt).toBeInstanceOf(Date);
    });

    it('should reject comment', () => {
      const commentContent = CommentContent.create(validContent);
      const comment = Comment.create(
        contentId,
        authorId,
        commentContent,
        tenantId,
      );

      comment.reject();

      expect(comment.moderationStatus).toBe(ModerationStatus.REJECTED);
      expect(comment.commentUpdatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Status Checks', () => {
    it('should check if comment is approved', () => {
      const commentContent = CommentContent.create(validContent);
      const comment = Comment.create(
        contentId,
        authorId,
        commentContent,
        tenantId,
      );

      expect(comment.isApproved()).toBe(false);
      expect(comment.isPending()).toBe(true);
      expect(comment.isRejected()).toBe(false);

      comment.approve();

      expect(comment.isApproved()).toBe(true);
      expect(comment.isPending()).toBe(false);
      expect(comment.isRejected()).toBe(false);
    });

    it('should check if comment is rejected', () => {
      const commentContent = CommentContent.create(validContent);
      const comment = Comment.create(
        contentId,
        authorId,
        commentContent,
        tenantId,
      );

      comment.reject();

      expect(comment.isApproved()).toBe(false);
      expect(comment.isPending()).toBe(false);
      expect(comment.isRejected()).toBe(true);
    });
  });

  describe('Reply Handling', () => {
    it('should indicate if comment is a reply', () => {
      const commentContent = CommentContent.create(validContent);
      const rootComment = Comment.create(
        contentId,
        authorId,
        commentContent,
        tenantId,
      );
      const replyComment = Comment.create(
        contentId,
        authorId,
        commentContent,
        tenantId,
        'parent-123',
      );

      expect(rootComment.isReply()).toBe(false);
      expect(replyComment.isReply()).toBe(true);
    });
  });

  describe('To Primitives', () => {
    it('should convert comment to primitives', () => {
      const commentContent = CommentContent.create(validContent);
      const comment = Comment.create(
        contentId,
        authorId,
        commentContent,
        tenantId,
      );

      const primitives = comment.toPrimitives();

      expect(primitives.id).toBe(comment.commentId);
      expect(primitives.contentId).toBe(contentId);
      expect(primitives.authorId).toBe(authorId);
      expect(primitives.tenantId).toBe(tenantId);
      expect(primitives.content.value).toBe(validContent);
      expect(primitives.moderationStatus).toBe(ModerationStatus.PENDING);
    });
  });
});
