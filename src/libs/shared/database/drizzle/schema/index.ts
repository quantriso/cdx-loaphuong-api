/**
 * Drizzle Schema Exports
 *
 * Export tất cả table schemas
 * Note: Feature module schemas will be added as they are implemented
 */

import {
  outboxStatusEnum,
  outboxTable,
} from '@shared/database/outbox/drizzle/schema/outbox.schema';

// TODO: Import feature module schemas as they are implemented
// import { productsTable } from '@modules/product/infrastructure/persistence/drizzle/schema';
// import { ordersTable, orderItemsTable, ordersRelations, orderItemsRelations } from '@modules/order/infrastructure/persistence/drizzle/schema';

export const schema = {
  outboxTable,
  outboxStatusEnum,
  // Feature module tables will be added here as they are implemented
};
