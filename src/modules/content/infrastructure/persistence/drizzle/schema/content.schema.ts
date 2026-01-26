import {
  pgTable,
  varchar,
  text,
  timestamp,
  jsonb,
  integer,
  index,
} from 'drizzle-orm/pg-core';

/**
 * Contents Table Schema
 *
 * Write model for Content aggregate following CQRS.
 * This is the source of truth for content data.
 *
 * Story 3.1: Create Content Draft
 */
export const contentsTable = pgTable(
  'contents',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    authorId: varchar('author_id', { length: 36 }).notNull(),

    // Content fields
    title: varchar('title', { length: 200 }).notNull(),
    content: text('content').notNull(),
    excerpt: varchar('excerpt', { length: 500 }),

    // Status and categorization
    status: varchar('status', { length: 20 }).notNull().default('DRAFT'),
    type: varchar('type', { length: 20 }).notNull(),
    priority: varchar('priority', { length: 20 }).notNull().default('MEDIUM'),
    categoryId: varchar('category_id', { length: 36 }),

    // Media
    featuredImage: varchar('featured_image', { length: 500 }),
    tags: jsonb('tags').default([]),

    // Concurrency control
    version: integer('version').notNull().default(1),

    // Timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('idx_contents_tenant_id').on(table.tenantId),
    authorIdIdx: index('idx_contents_author_id').on(table.authorId),
    statusIdx: index('idx_contents_status').on(table.status),
    typeIdx: index('idx_contents_type').on(table.type),
    categoryIdIdx: index('idx_contents_category_id').on(table.categoryId),
    createdAtIdx: index('idx_contents_created_at').on(table.createdAt),
  }),
);

export type ContentRecord = typeof contentsTable.$inferSelect;
export type ContentRecordInsert = typeof contentsTable.$inferInsert;
