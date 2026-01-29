import { ICommand } from '@core/application';
import { TagCategory } from '../../domain';

/**
 * Create Tag Command
 *
 * Story 4.3: Create, Edit, Delete Tags
 */
export class CreateTagCommand implements ICommand {
  constructor(
    public readonly tenantId: string,
    public readonly name: string,
    public readonly category: TagCategory,
    public readonly description: string | undefined,
    public readonly color: string | undefined,
    public readonly synonyms: string[] | undefined,
    public readonly metadata: Record<string, unknown> | undefined,
    public readonly createdBy: string,
  ) {}
}
