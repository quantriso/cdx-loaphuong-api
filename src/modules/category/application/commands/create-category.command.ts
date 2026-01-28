import { ICommand } from '@core/application';

/**
 * Create Category Command
 *
 * Story 4.1: Manage Categories
 */
export class CreateCategoryCommand implements ICommand {
  constructor(
    public readonly tenantId: string,
    public readonly value: string,
    public readonly label: string,
    public readonly description: string | undefined,
    public readonly color: string | undefined,
    public readonly icon: string | undefined,
    public readonly sortOrder: number,
    public readonly parentId: string | null,
    public readonly createdBy: string,
  ) {}
}
