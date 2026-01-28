import { ICommand } from '@core/application';

/**
 * Delete Category Command
 *
 * Story 4.1: Manage Categories
 */
export class DeleteCategoryCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly deletedBy: string,
  ) {}
}
