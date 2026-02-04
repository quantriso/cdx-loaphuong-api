import { pgTable, text, timestamp, varchar, index } from 'drizzle-orm/pg-core';

/**
 * Comments Table Schema
 *
 * Story 6.1: Add comments on published content
 *
 * Stores comment data with support for:
 * - Root comments and replies (parentCommentId)
 * - Moderation status tracking
 * - User mentions
 * - Multi-tenancy support
 */
export const comments = pgTable(
  'comments',
  {
    id: varchar('id', { length: 25 }).primaryKey(),
    contentId: varchar('content_id', { length: 25 }).notNull(),
    parentCommentId: varchar('parent_comment_id', { length: 25 }),
    authorId: varchar('author_id', { length: 25 }).notNull(),
    content: text('content').notNull(),
    tenantId: varchar('tenant_id', { length: 25 }).notNull(),
    moderationStatus: varchar('moderation_status', { length: 20 })
      .notNull()
      .default('PENDING'),
    mentions: text('mentions').array(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    // Index for querying comments by content
    contentIdIdx: index('idx_comments_content_id').on(table.contentId),
    // Index for querying replies to a comment
    parentCommentIdIdx: index('idx_comments_parent_comment_id').on(
      table.parentCommentId,
    ),
    // Index for querying comments by author
    authorIdIdx: index('idx_comments_author_id').on(table.authorId),
    // Index for moderation queue queries
    moderationStatusIdx: index('idx_comments_moderation_status').on(
      table.moderationStatus,
    ),
    // Composite index for tenant-specific queries
    tenantIdIdx: index('idx_comments_tenant_id').on(table.tenantId),
    // Composite index for content + tenant queries
    contentTenantIdx: index('idx_comments_content_tenant').on(
      table.contentId,
      table.tenantId,
    ),
  }),
);

export type CommentSchema = typeof comments;
