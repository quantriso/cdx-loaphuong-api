/**
 * Database Schema Index
 *
 * Central place to export all database table schemas.
 * This schema object is passed to Drizzle ORM for type-safe queries.
 *
 * As new modules are added, import and re-export their schemas here.
 */

// Outbox Schema (Core Infrastructure)
export * from '../outbox/drizzle/schema/outbox.schema';

// Tenant Module Schema
export * from '../../../../modules/tenant/infrastructure/persistence/drizzle/schema';

// Content Module Schema
export * from '../../../../modules/content/infrastructure/persistence/drizzle/schema';

// Category Module Schema
export * from '../../../../modules/category/infrastructure/persistence/drizzle/schema';

// Tag Module Schema
export * from '../../../../modules/tag/infrastructure/persistence/drizzle/schema';

// Future module schemas will be added here as they are implemented
// Example:
// export * from '../../../../modules/user/infrastructure/persistence/drizzle/schema';

/**
 * Combined schema object for Drizzle ORM
 *
 * Import this in DrizzleDatabaseModule.forRoot({ schema })
 */
import * as outboxSchema from '../outbox/drizzle/schema/outbox.schema';
import * as tenantSchema from '../../../../modules/tenant/infrastructure/persistence/drizzle/schema';
import * as contentSchema from '../../../../modules/content/infrastructure/persistence/drizzle/schema';
import * as categorySchema from '../../../../modules/category/infrastructure/persistence/drizzle/schema';
import * as tagSchema from '../../../../modules/tag/infrastructure/persistence/drizzle/schema';

export const schema = {
  ...outboxSchema,
  ...tenantSchema,
  ...contentSchema,
  ...categorySchema,
  ...tagSchema,
};
