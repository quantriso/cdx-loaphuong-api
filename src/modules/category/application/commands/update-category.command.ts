import { ICommand } from '@core/application';

/**
 * Update Category Command
 *
 * Story 4.1: Manage Categories
 */
export class UpdateCategoryCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly label: string | undefined,
    public readonly description: string | undefined,
    public readonly color: string | undefined,
    public readonly icon: string | undefined,
    public readonly isActive: boolean | undefined,
    public readonly sortOrder: number | undefined,
    public readonly parentId: string | null | undefined,
    public readonly updatedBy: string,
  ) {}
}
