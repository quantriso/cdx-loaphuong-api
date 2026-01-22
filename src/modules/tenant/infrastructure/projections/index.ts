// Projections (Read Model Sync)
export * from './tenant-read-model.projection';

import { TenantReadModelProjection } from './tenant-read-model.projection';

/**
 * Event Handlers Array (Projections)
 * Export as array for easy registration in module providers
 */
export const EventHandlers = [
  TenantReadModelProjection,
];
