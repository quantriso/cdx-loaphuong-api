import { ICommand } from '@core/application';

/**
 * Delete Tag Command
 *
 * Story 4.3: Create, Edit, Delete Tags
 */
export class DeleteTagCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly deletedBy: string,
    public readonly force: boolean = false,
  ) {}
}
