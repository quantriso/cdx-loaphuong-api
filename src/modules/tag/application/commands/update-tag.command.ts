import { ICommand } from '@core/application';
import { TagCategory } from '../../domain';

/**
 * Update Tag Command
 *
 * Story 4.3: Create, Edit, Delete Tags
 */
export class UpdateTagCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly name: string | undefined,
    public readonly description: string | undefined,
    public readonly color: string | undefined,
    public readonly category: TagCategory | undefined,
    public readonly synonyms: string[] | undefined,
    public readonly isActive: boolean | undefined,
    public readonly metadata: Record<string, unknown> | undefined,
    public readonly updatedBy: string,
  ) {}
}
