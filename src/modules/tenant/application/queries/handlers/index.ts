// Query Handlers
export * from './get-tenant.handler';
export * from './list-tenants.handler';

import { GetTenantHandler } from './get-tenant.handler';
import { ListTenantsHandler } from './list-tenants.handler';

/**
 * Query Handlers Array
 * Export as array for easy registration in module providers
 */
export const QueryHandlers = [GetTenantHandler, ListTenantsHandler];
