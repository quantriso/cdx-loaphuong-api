import {
  pgTable,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';

/**
 * Categories Table Schema
 *
 * Write model for Category aggregate following CQRS.
 * This is the source of truth for category data.
 *
 * Story 4.1: Manage Categories
 */
export const categoriesTable = pgTable(
  'categories',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),

    // Category fields
    value: varchar('value', { length: 100 }).notNull(),
    label: varchar('label', { length: 100 }).notNull(),
    description: text('description'),
    color: varchar('color', { length: 7 }),
    icon: varchar('icon', { length: 50 }),

    // Status
    isActive: boolean('is_active').notNull().default(true),

    // Hierarchy
    parentId: varchar('parent_id', { length: 36 }),
    sortOrder: integer('sort_order').notNull().default(0),

    // Soft delete
    isDeleted: boolean('is_deleted').notNull().default(false),
    deletedAt: timestamp('deleted_at'),
    deletedBy: varchar('deleted_by', { length: 36 }),

    // Concurrency control
    version: integer('version').notNull().default(0),

    // Timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    createdBy: varchar('created_by', { length: 36 }).notNull(),
    updatedBy: varchar('updated_by', { length: 36 }),
  },
  (table) => ({
    tenantIdIdx: index('idx_categories_tenant_id').on(table.tenantId),
    valueIdx: index('idx_categories_value').on(table.value),
    tenantValueIdx: index('idx_categories_tenant_value').on(
      table.tenantId,
      table.value,
    ),
    parentIdIdx: index('idx_categories_parent_id').on(table.parentId),
    isActiveIdx: index('idx_categories_is_active').on(table.isActive),
    sortOrderIdx: index('idx_categories_sort_order').on(table.sortOrder),
    isDeletedIdx: index('idx_categories_is_deleted').on(table.isDeleted),
  }),
);

export type CategoryRecord = typeof categoriesTable.$inferSelect;
export type CategoryRecordInsert = typeof categoriesTable.$inferInsert;
