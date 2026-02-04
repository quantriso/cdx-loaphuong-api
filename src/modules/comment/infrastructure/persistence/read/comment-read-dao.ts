import { Injectable } from '@nestjs/common';
import type { DrizzleDB } from '@shared';
import { eq, and, desc } from 'drizzle-orm';
import * as schema from '../drizzle/schema/comment.schema';
import type { ICommentReadDaoPort } from '../../../application/queries/ports/comment-read-dao.interface';
import { CommentDto } from '../../../application/dtos/comment.dto';

/**
 * Comment Read DAO Implementation
 *
 * Story 6.1: Add comments on published content
 *
 * Implements read-only access to comment data optimized for query operations.
 * Follows CQRS pattern by separating read concerns from write concerns.
 *
 * This DAO is designed for efficient read operations and does not modify data.
 * It returns DTOs (Data Transfer Objects) rather than domain entities.
 */
@Injectable()
export class CommentReadDao implements ICommentReadDaoPort {
  constructor(private readonly db: DrizzleDB) {}

  async findPaginated(params: {
    contentId?: string;
    tenantId: string;
    page: number;
    limit: number;
    includeReplies?: boolean;
  }): Promise<{ comments: CommentDto[]; total: number }> {
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

    const commentDtos = comments.map((row) => this.mapToDto(row));

    // Optionally include replies
    if (includeReplies) {
      for (const comment of commentDtos) {
        if (!comment.parentId) {
          const replies = await this.findReplies(comment.id, tenantId);
          comment.replies = replies;
        }
      }
    }

    return {
      comments: commentDtos,
      total: totalResult.length,
    };
  }

  async findByContentId(
    contentId: string,
    tenantId: string,
  ): Promise<CommentDto[]> {
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

    return results.map((row) => this.mapToDto(row));
  }

  async findReplies(
    parentCommentId: string,
    tenantId: string,
  ): Promise<CommentDto[]> {
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

    return results.map((row) => this.mapToDto(row));
  }

  async findByAuthorId(
    authorId: string,
    tenantId: string,
  ): Promise<CommentDto[]> {
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

    return results.map((row) => this.mapToDto(row));
  }

  async findByModerationStatus(
    status: string,
    tenantId: string,
    limit?: number,
  ): Promise<CommentDto[]> {
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

    return results.map((row) => this.mapToDto(row));
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

  async findById(id: string, tenantId: string): Promise<CommentDto | null> {
    const result = await this.db
      .select()
      .from(schema.comments)
      .where(
        and(eq(schema.comments.id, id), eq(schema.comments.tenantId, tenantId)),
      )
      .limit(1);

    if (!result[0]) {
      return null;
    }

    return this.mapToDto(result[0]);
  }

  private mapToDto(row: any): CommentDto {
    return CommentDto.fromRaw({
      id: row.id,
      content: row.content,
      contentId: row.contentId,
      authorId: row.authorId,
      tenantId: row.tenantId,
      mentions: row.mentions || [],
      parentId: row.parentCommentId || null,
      moderationStatus: row.moderationStatus,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });
  }
}
