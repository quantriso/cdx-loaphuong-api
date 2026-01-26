import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { RejectContentCommand } from '../reject-content.command';
import type { IContentRepository } from '../../../domain/repositories';
import { CONTENT_REPOSITORY_TOKEN } from '../../../constants/tokens';
import { NotFoundException } from '@core/common';

/**
 * Reject Content Command Handler
 *
 * Story 3.5: Reject Content with Feedback
 *
 * Handles rejection of PENDING content by Admin with feedback.
 * Status transition: PENDING → REJECTED
 *
 * Business Flow:
 * 1. Validate content exists and belongs to tenant
 * 2. Content entity validates status (must be PENDING)
 * 3. Execute reject() business method with reason
 * 4. Save aggregate (auto-publishes ContentRejectedEvent)
 * 5. Event handlers update read model and send feedback to author
 */
@CommandHandler(RejectContentCommand)
export class RejectContentHandler
  implements ICommandHandler<RejectContentCommand, void>
{
  constructor(
    @Inject(CONTENT_REPOSITORY_TOKEN)
    private readonly contentRepository: IContentRepository,
  ) {}

  async execute(command: RejectContentCommand): Promise<void> {
    const { contentId, tenantId, rejectedBy, rejectionReason } = command;

    // 1. Load aggregate
    const content = await this.contentRepository.getById(contentId);

    if (!content) {
      throw new NotFoundException('Content', contentId);
    }

    // 2. Verify tenant ownership
    if (content.tenantId !== tenantId) {
      throw new NotFoundException('Content', contentId);
    }

    // 3. Execute business logic (will validate status, reason, and emit event)
    content.reject(rejectedBy, rejectionReason);

    // 4. Save aggregate (repository will publish domain events)
    await this.contentRepository.save(content);

    // Note: ContentRejectedEvent will be handled by:
    // - ContentReadModelProjection: Updates read model
    // - Future NotificationHandler: Sends rejection feedback to author
    // - Future AuditHandler: Logs rejection with reason in audit trail
  }
}
