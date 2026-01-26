import { ICommand } from '@core/application/commands';

/**
 * Archive Content Command
 *
 * Story 3.7: Archive Content
 * Admin archives PUBLISHED content → ARCHIVED status
 */
export class ArchiveContentCommand implements ICommand {
  constructor(
    public readonly contentId: string,
    public readonly tenantId: string,
    public readonly archivedBy: string,
  ) {}
}
