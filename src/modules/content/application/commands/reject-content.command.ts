import { ICommand } from '@core/application/commands';

/**
 * Reject Content Command
 *
 * Story 3.5: Reject Content with Feedback
 * Admin rejects PENDING content → REJECTED status with feedback
 */
export class RejectContentCommand implements ICommand {
  constructor(
    public readonly contentId: string,
    public readonly tenantId: string,
    public readonly rejectedBy: string,
    public readonly rejectionReason: string,
  ) {}
}
