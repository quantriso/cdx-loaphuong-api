import {
  pgTable,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  index,
  unique,
} from 'drizzle-orm/pg-core';

/**
 * Tags Table Schema
 *
 * Story 4.3: Create, Edit, Delete Tags
 */
export const tagsTable = pgTable(
  'tags',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull(),
    description: text('description'),
    color: varchar('color', { length: 7 }),
    category: varchar('category', { length: 50 }).notNull(),
    synonyms: text('synonyms').array().notNull().default([]),
    isActive: boolean('is_active').notNull().default(true),
    usageCount: integer('usage_count').notNull().default(0),
    metadata: jsonb('metadata'),
    isDeleted: boolean('is_deleted').notNull().default(false),
    deletedAt: timestamp('deleted_at'),
    deletedBy: varchar('deleted_by', { length: 36 }),
    version: integer('version').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    createdBy: varchar('created_by', { length: 36 }).notNull(),
    updatedBy: varchar('updated_by', { length: 36 }),
  },
  (table) => ({
    tenantIdIdx: index('idx_tags_tenant_id').on(table.tenantId),
    slugIdx: index('idx_tags_slug').on(table.slug),
    categoryIdx: index('idx_tags_category').on(table.category),
    isActiveIdx: index('idx_tags_is_active').on(table.isActive),
    isDeletedIdx: index('idx_tags_is_deleted').on(table.isDeleted),
    tenantSlugUnique: unique('uq_tags_tenant_slug').on(
      table.tenantId,
      table.slug,
    ),
  }),
);

export type TagRecord = typeof tagsTable.$inferSelect;
export type TagRecordInsert = typeof tagsTable.$inferInsert;
