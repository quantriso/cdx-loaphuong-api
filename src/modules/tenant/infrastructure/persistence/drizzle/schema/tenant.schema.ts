import { pgTable, varchar, timestamp, jsonb, integer, index } from 'drizzle-orm/pg-core';

/**
 * Tenants Table Schema
 *
 * This schema represents the write model for Tenant aggregate
 * In CQRS, this is the source of truth for write operations
 */
export const tenantsTable = pgTable(
  'tenants',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 100 }).notNull().unique(), // subdomain
    name: varchar('name', { length: 255 }).notNull(),
    adminEmail: varchar('admin_email', { length: 255 }).notNull(),
    adminPasswordHash: varchar('admin_password_hash', { length: 255 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('ACTIVE'), // ACTIVE, SUSPENDED, DELETED
    brandingConfig: jsonb('branding_config'),
    limits: jsonb('limits'),
    createdBy: varchar('created_by', { length: 255 }),
    deletedAt: timestamp('deleted_at'),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('idx_tenants_tenant_id').on(table.tenantId),
    statusIdx: index('idx_tenants_status').on(table.status),
    deletedAtIdx: index('idx_tenants_deleted_at').on(table.deletedAt),
    createdAtIdx: index('idx_tenants_created_at').on(table.createdAt),
  }),
);

export type TenantRecord = typeof tenantsTable.$inferSelect;
export type InsertTenantRecord = typeof tenantsTable.$inferInsert;
