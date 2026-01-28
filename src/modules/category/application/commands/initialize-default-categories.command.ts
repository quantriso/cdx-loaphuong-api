import type { ICommand } from '@core/application';

/**
 * Initialize Default Categories Command
 *
 * Story 4.2: Initialize Default Categories
 *
 * Creates the 9 predefined categories for a tenant.
 */
export class InitializeDefaultCategoriesCommand implements ICommand {
  constructor(public readonly tenantId: string) {}
}
