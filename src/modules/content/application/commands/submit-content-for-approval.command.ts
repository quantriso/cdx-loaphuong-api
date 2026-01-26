import { ICommand } from '@core/application';

/**
 * Submit Content for Approval Command
 *
 * Story 3.3: Submit Content for Approval
 *
 * Command to submit DRAFT content for approval.
 * Transitions content from DRAFT to PENDING status.
 *
 * Business Rules:
 * - Only DRAFT content can be submitted
 * - Only author or admin can submit
 * - Tenant isolation must be enforced
 */
export class SubmitContentForApprovalCommand implements ICommand {
  constructor(
    public readonly contentId: string,
    public readonly tenantId: string,
    public readonly userId: string,
  ) {}
}
