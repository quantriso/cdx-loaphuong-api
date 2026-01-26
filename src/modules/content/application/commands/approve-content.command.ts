import { ICommand } from '@core/application/commands';

/**
 * Approve Content Command
 *
 * Story 3.4: Approve Content
 * Admin approves PENDING content → APPROVED status
 */
export class ApproveContentCommand implements ICommand {
  constructor(
    public readonly contentId: string,
    public readonly tenantId: string,
    public readonly approvedBy: string,
    public readonly approvalReason?: string,
  ) {}
}
