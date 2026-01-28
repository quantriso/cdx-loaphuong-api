import {
  pgTable,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
} from 'drizzle-orm/pg-core';

/**
 * Categories Table Schema
 *
 * Story 4.1: Manage Categories
 */
export const categoriesTable = pgTable('categories', {
  id: varchar('id', { length: 36 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 36 }).notNull(),
  value: varchar('value', { length: 100 }).notNull(),
  label: varchar('label', { length: 100 }).notNull(),
  description: text('description'),
  color: varchar('color', { length: 7 }),
  icon: text('icon'),
  isActive: boolean('is_active').notNull().default(true),
  parentId: varchar('parent_id', { length: 36 }),
  sortOrder: integer('sort_order').notNull().default(0),
  isDeleted: boolean('is_deleted').notNull().default(false),
  deletedAt: timestamp('deleted_at'),
  deletedBy: varchar('deleted_by', { length: 36 }),
  version: integer('version').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: varchar('created_by', { length: 36 }).notNull(),
  updatedBy: varchar('updated_by', { length: 36 }),
});

export type CategoryRecord = typeof categoriesTable.$inferSelect;
export type CategoryRecordInsert = typeof categoriesTable.$inferInsert;
