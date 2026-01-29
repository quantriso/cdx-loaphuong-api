import {
  pgTable,
  varchar,
  timestamp,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';

/**
 * Content Tags Junction Table Schema
 *
 * Story 4.5: Filter Content by Category & Tags
 *
 * Many-to-many relationship between Contents and Tags.
 * Allows content to have multiple tags and tags to be used by multiple contents.
 *
 * Business Rules:
 * - One content can have multiple tags
 * - One tag can be assigned to multiple contents
 * - Deleting content removes all tag associations (CASCADE)
 * - Deleting tag removes all content associations (CASCADE)
 */
export const contentTagsTable = pgTable(
  'content_tags',
  {
    contentId: varchar('content_id', { length: 36 }).notNull(),
    tagId: varchar('tag_id', { length: 36 }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.contentId, table.tagId] }),
    contentIdIdx: index('idx_content_tags_content_id').on(table.contentId),
    tagIdIdx: index('idx_content_tags_tag_id').on(table.tagId),
  }),
);

export type ContentTagRecord = typeof contentTagsTable.$inferSelect;
export type ContentTagRecordInsert = typeof contentTagsTable.$inferInsert;
