import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ApproveContentCommand } from '../approve-content.command';
import type { IContentRepository } from '../../../domain/repositories';
import { CONTENT_REPOSITORY_TOKEN } from '../../../constants/tokens';
import { NotFoundException } from '@core/common';

/**
 * Approve Content Command Handler
 *
 * Story 3.4: Approve Content
 *
 * Handles approval of PENDING content by Admin.
 * Status transition: PENDING → APPROVED
 *
 * Business Flow:
 * 1. Validate content exists and belongs to tenant
 * 2. Content entity validates status (must be PENDING)
 * 3. Execute approve() business method
 * 4. Save aggregate (auto-publishes ContentApprovedEvent)
 * 5. Event handlers update read model and send notifications
 */
@CommandHandler(ApproveContentCommand)
export class ApproveContentHandler implements ICommandHandler<
  ApproveContentCommand,
  void
> {
  constructor(
    @Inject(CONTENT_REPOSITORY_TOKEN)
    private readonly contentRepository: IContentRepository,
  ) {}

  async execute(command: ApproveContentCommand): Promise<void> {
    const { contentId, tenantId, approvedBy, approvalReason } = command;

    // 1. Load aggregate
    const content = await this.contentRepository.getById(contentId);

    if (!content) {
      throw new NotFoundException('Content', contentId);
    }

    // 2. Verify tenant ownership
    if (content.tenantId !== tenantId) {
      throw new NotFoundException('Content', contentId);
    }

    // 3. Execute business logic (will validate status and emit event)
    content.approve(approvedBy, approvalReason);

    // 4. Save aggregate (repository will publish domain events)
    await this.contentRepository.save(content);

    // Note: ContentApprovedEvent will be handled by:
    // - ContentReadModelProjection: Updates read model
    // - Future NotificationHandler: Sends notification to author
    // - Future AuditHandler: Logs approval in audit trail
  }
}
