// Command Handlers
export * from './create-tenant.handler';
export * from './update-tenant.handler';
export * from './reset-admin-password.handler';
export * from './soft-delete-tenant.handler';

import { CreateTenantHandler } from './create-tenant.handler';
import { UpdateTenantHandler } from './update-tenant.handler';
import { ResetAdminPasswordHandler } from './reset-admin-password.handler';
import { SoftDeleteTenantHandler } from './soft-delete-tenant.handler';

/**
 * Command Handlers Array
 * Export as array for easy registration in module providers
 */
export const CommandHandlers = [
  CreateTenantHandler,
  UpdateTenantHandler,
  ResetAdminPasswordHandler,
  SoftDeleteTenantHandler,
];
