import { ICommand } from '@core/application/commands';

/**
 * Publish Content Command
 *
 * Story 3.6: Publish Content
 * Admin publishes APPROVED content → PUBLISHED status
 */
export class PublishContentCommand implements ICommand {
  constructor(
    public readonly contentId: string,
    public readonly tenantId: string,
    public readonly publishedBy: string,
  ) {}
}
