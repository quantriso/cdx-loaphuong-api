import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { PublishContentCommand } from '../publish-content.command';
import type { IContentRepository } from '../../../domain/repositories';
import { CONTENT_REPOSITORY_TOKEN } from '../../../constants/tokens';
import { NotFoundException } from '@core/common';

/**
 * Publish Content Command Handler
 *
 * Story 3.6: Publish Content
 *
 * Handles publication of APPROVED content by Admin.
 * Status transition: APPROVED → PUBLISHED
 *
 * Business Flow:
 * 1. Validate content exists and belongs to tenant
 * 2. Content entity validates status (must be APPROVED)
 * 3. Execute publish() business method
 * 4. Save aggregate (auto-publishes ContentPublishedEvent)
 * 5. Event handlers update read model and send notifications
 */
@CommandHandler(PublishContentCommand)
export class PublishContentHandler
  implements ICommandHandler<PublishContentCommand, void>
{
  constructor(
    @Inject(CONTENT_REPOSITORY_TOKEN)
    private readonly contentRepository: IContentRepository,
  ) {}

  async execute(command: PublishContentCommand): Promise<void> {
    const { contentId, tenantId, publishedBy } = command;

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
    content.publish(publishedBy);

    // 4. Save aggregate (repository will publish domain events)
    await this.contentRepository.save(content);

    // Note: ContentPublishedEvent will be handled by:
    // - ContentReadModelProjection: Updates read model
    // - Future NotificationHandler: Sends publication notification to author
    // - Future AuditHandler: Logs publication in audit trail
  }
}
