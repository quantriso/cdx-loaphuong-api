import { Injectable } from '@nestjs/common';
import { type DrizzleDB } from '@shared';
import * as schema from '../drizzle/schema/comment.schema';
import {
  Comment,
  CommentProps,
  ModerationStatus,
} from '../../../domain/entities/comment.entity';
import { CommentId } from '../../../domain/value-objects/comment-id.value-object';
import { eq, and, desc } from 'drizzle-orm';
import type { CommentRepositoryInterface } from '../../../domain/repositories/comment.repository.interface';

/**
 * Comment Repository Implementation
 *
 * Story 6.1: Add comments on published content
 *
 * Implements the CommentRepositoryInterface using Drizzle ORM.
 * Handles persistence of Comment aggregates and provides query capabilities.
 */
@Injectable()
export class CommentRepository implements CommentRepositoryInterface {
  constructor(private readonly db: DrizzleDB) {}

  async save(comment: Comment): Promise<void> {
    const data = comment.toPrimitives();

    await this.db.insert(schema.comments).values({
      id: data.id,
      contentId: data.contentId,
      content: data.content.value,
      authorId: data.authorId,
      tenantId: data.tenantId,
      parentCommentId: data.parentCommentId || null,
      moderationStatus: data.moderationStatus,
      mentions: data.mentions || [],
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  async update(comment: Comment): Promise<void> {
    const data = comment.toPrimitives();

    await this.db
      .update(schema.comments)
      .set({
        content: data.content.value,
        moderationStatus: data.moderationStatus,
        updatedAt: data.updatedAt,
      })
      .where(eq(schema.comments.id, data.id));
  }

  async findById(id: CommentId): Promise<Comment | null> {
    const result = await this.db
      .select()
      .from(schema.comments)
      .where(eq(schema.comments.id, id.value))
      .limit(1);

    if (!result[0]) {
      return null;
    }

    return this.mapToEntity(result[0]);
  }

  async getById(id: CommentId): Promise<Comment> {
    const comment = await this.findById(id);

    if (!comment) {
      throw new Error(`Comment with ID ${id.value} not found`);
    }

    return comment;
  }

  async findByContentId(
    contentId: string,
    tenantId: string,
  ): Promise<Comment[]> {
    const results = await this.db
      .select()
      .from(schema.comments)
      .where(
        and(
          eq(schema.comments.contentId, contentId),
          eq(schema.comments.tenantId, tenantId),
        ),
      )
      .orderBy(desc(schema.comments.createdAt));

    return results.map((row) => this.mapToEntity(row));
  }

  async findReplies(
    parentCommentId: string,
    tenantId: string,
  ): Promise<Comment[]> {
    const results = await this.db
      .select()
      .from(schema.comments)
      .where(
        and(
          eq(schema.comments.parentCommentId, parentCommentId),
          eq(schema.comments.tenantId, tenantId),
        ),
      )
      .orderBy(desc(schema.comments.createdAt));

    return results.map((row) => this.mapToEntity(row));
  }

  async findByAuthorId(authorId: string, tenantId: string): Promise<Comment[]> {
    const results = await this.db
      .select()
      .from(schema.comments)
      .where(
        and(
          eq(schema.comments.authorId, authorId),
          eq(schema.comments.tenantId, tenantId),
        ),
      )
      .orderBy(desc(schema.comments.createdAt));

    return results.map((row) => this.mapToEntity(row));
  }

  async findByModerationStatus(
    status: string,
    tenantId: string,
    limit?: number,
  ): Promise<Comment[]> {
    const query = this.db
      .select()
      .from(schema.comments)
      .where(
        and(
          eq(schema.comments.moderationStatus, status),
          eq(schema.comments.tenantId, tenantId),
        ),
      )
      .orderBy(desc(schema.comments.createdAt));

    if (limit) {
      query.limit(limit);
    }

    const results = await query;

    return results.map((row) => this.mapToEntity(row));
  }

  async delete(id: CommentId): Promise<void> {
    await this.db
      .delete(schema.comments)
      .where(eq(schema.comments.id, id.value));
  }

  async exists(id: CommentId): Promise<boolean> {
    const result = await this.db
      .select({ count: schema.comments.id })
      .from(schema.comments)
      .where(eq(schema.comments.id, id.value))
      .limit(1);

    return result.length > 0;
  }

  async countByContentId(contentId: string, tenantId: string): Promise<number> {
    const result = await this.db
      .select({ count: schema.comments.id })
      .from(schema.comments)
      .where(
        and(
          eq(schema.comments.contentId, contentId),
          eq(schema.comments.tenantId, tenantId),
        ),
      );

    return result.length;
  }

  async findPaginated(params: {
    contentId?: string;
    tenantId: string;
    page: number;
    limit: number;
    includeReplies?: boolean;
  }): Promise<{ comments: Comment[]; total: number }> {
    const { contentId, tenantId, page, limit, includeReplies } = params;
    const offset = (page - 1) * limit;

    const conditions = [
      eq(schema.comments.tenantId, tenantId),
      contentId ? eq(schema.comments.contentId, contentId) : undefined,
    ].filter(
      (condition): condition is NonNullable<typeof condition> =>
        condition !== undefined,
    );

    const [comments, totalResult] = await Promise.all([
      this.db
        .select()
        .from(schema.comments)
        .where(and(...conditions))
        .orderBy(desc(schema.comments.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: schema.comments.id })
        .from(schema.comments)
        .where(and(...conditions)),
    ]);

    let commentList = comments.map((row) => this.mapToEntity(row));

    // Optionally include replies
    if (includeReplies) {
      for (const comment of commentList) {
        if (!comment.parentCommentId) {
          const replies = await this.findReplies(comment.commentId, tenantId);
          // Note: In a real implementation, you might want to structure this differently
          // This is a simplified approach
        }
      }
    }

    return {
      comments: commentList,
      total: totalResult.length,
    };
  }

  private mapToEntity(row: any): Comment {
    // Create CommentContent value object from stored content
    const {
      CommentContent,
    } = require('../../../domain/value-objects/comment-content.value-object');
    const commentContent = new CommentContent(row.content);

    const props: CommentProps = {
      id: row.id,
      contentId: row.contentId,
      authorId: row.authorId,
      content: commentContent,
      tenantId: row.tenantId,
      moderationStatus: row.moderationStatus as ModerationStatus,
      parentCommentId: row.parentCommentId || undefined,
      mentions: row.mentions || [],
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };

    return Comment.reconstitute(props);
  }
}
