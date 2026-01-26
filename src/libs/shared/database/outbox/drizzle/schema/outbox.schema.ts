import {
  pgTable,
  varchar,
  text,
  timestamp,
  integer,
  index,
} from 'drizzle-orm/pg-core';

/**
 * Outbox Entry Status Type
 * Using VARCHAR instead of pgEnum to avoid Drizzle ORM prepared statement issues
 */
export type OutboxStatus = 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED';

/**
 * Outbox Table Schema
 *
 * Stores domain events for the Transactional Outbox Pattern.
 * Events are saved in the same transaction as the aggregate,
 * then processed asynchronously by the OutboxProcessor.
 *
 * Note: status field uses VARCHAR instead of pgEnum due to Drizzle ORM
 * compatibility issues with PostgreSQL enums in prepared statements.
 *
 * Indexes:
 * - status + createdAt: For efficient polling of pending events
 * - aggregateId: For querying events by aggregate
 * - eventType: For filtering specific event types
 */
export const outboxTable = pgTable(
  'outbox',
  {
    /** Event ID (UUID) - Primary Key */
    id: varchar('id', { length: 36 }).primaryKey(),

    /** Aggregate ID that produced this event */
    aggregateId: varchar('aggregate_id', { length: 36 }).notNull(),

    /** Aggregate type (e.g., 'Product', 'Order') */
    aggregateType: varchar('aggregate_type', { length: 100 }).notNull(),

    /** Event type (e.g., 'ProductCreated', 'OrderShipped') */
    eventType: varchar('event_type', { length: 100 }).notNull(),

    /** Event payload as JSON string */
    payload: text('payload').notNull(),

    /** Processing status - VARCHAR instead of enum for Drizzle compatibility */
    status: varchar('status', { length: 20 })
      .notNull()
      .default('PENDING')
      .$type<OutboxStatus>(),

    /** Creation timestamp */
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),

    /** Processing completion timestamp */
    processedAt: timestamp('processed_at', { withTimezone: true }),

    /** Number of retry attempts */
    retryCount: integer('retry_count').notNull().default(0),

    /** Last error message if failed */
    lastError: text('last_error'),
  },
  (table) => [
    // Index for efficient polling of pending events
    index('idx_outbox_status_created').on(table.status, table.createdAt),

    // Index for querying events by aggregate
    index('idx_outbox_aggregate').on(table.aggregateId),

    // Index for filtering by event type
    index('idx_outbox_event_type').on(table.eventType),
  ],
);

/**
 * TypeScript type for Outbox record
 */
export type OutboxRecord = typeof outboxTable.$inferSelect;
export type NewOutboxRecord = typeof outboxTable.$inferInsert;
