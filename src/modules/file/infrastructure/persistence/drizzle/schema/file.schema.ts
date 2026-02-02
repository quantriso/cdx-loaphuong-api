import {
  pgTable,
  varchar,
  bigint,
  timestamp,
  jsonb,
  integer,
  index,
  text,
} from 'drizzle-orm/pg-core';

/**
 * Files Table Schema
 *
 * This schema represents the write model for File aggregate
 * In CQRS, this is the source of truth for write operations
 */
export const filesTable = pgTable(
  'files',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    originalFileName: varchar('original_file_name', { length: 255 }).notNull(),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    fileSize: bigint('file_size', { mode: 'bigint' }).notNull(),
    fileType: varchar('file_type', { length: 20 }).notNull(), // IMAGE, DOCUMENT, VIDEO, AUDIO, OTHER
    storagePath: varchar('storage_path', { length: 500 }).notNull(),
    storageProvider: varchar('storage_provider', { length: 50 })
      .notNull()
      .default('local'), // local, s3, azure
    processedPath: varchar('processed_path', { length: 500 }),
    thumbnailPath: varchar('thumbnail_path', { length: 500 }),
    processedMetadata: jsonb('processed_metadata'), // Image dimensions, format info, etc.
    uploadedBy: varchar('uploaded_by', { length: 36 }).notNull(),
    deletedAt: timestamp('deleted_at'),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('idx_files_tenant_id').on(table.tenantId),
    fileTypeIdx: index('idx_files_file_type').on(table.fileType),
    uploadedByIdx: index('idx_files_uploaded_by').on(table.uploadedBy),
    createdAtIdx: index('idx_files_created_at').on(table.createdAt),
    deletedAtIdx: index('idx_files_deleted_at').on(table.deletedAt),
  }),
);

export type FileRecord = typeof filesTable.$inferSelect;
export type InsertFileRecord = typeof filesTable.$inferInsert;
