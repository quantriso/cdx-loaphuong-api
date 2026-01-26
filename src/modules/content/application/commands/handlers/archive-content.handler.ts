import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ArchiveContentCommand } from '../archive-content.command';
import type { IContentRepository } from '../../../domain/repositories';
import { CONTENT_REPOSITORY_TOKEN } from '../../../constants/tokens';
import { NotFoundException } from '@core/common';

/**
 * Archive Content Command Handler
 *
 * Story 3.7: Archive Content
 *
 * Handles archival of PUBLISHED content by Admin.
 * Status transition: PUBLISHED → ARCHIVED
 *
 * Business Flow:
 * 1. Validate content exists and belongs to tenant
 * 2. Content entity validates status (must be PUBLISHED)
 * 3. Execute archive() business method
 * 4. Save aggregate (auto-publishes ContentArchivedEvent)
 * 5. Event handlers update read model and remove from active lists
 */
@CommandHandler(ArchiveContentCommand)
export class ArchiveContentHandler
  implements ICommandHandler<ArchiveContentCommand, void>
{
  constructor(
    @Inject(CONTENT_REPOSITORY_TOKEN)
    private readonly contentRepository: IContentRepository,
  ) {}

  async execute(command: ArchiveContentCommand): Promise<void> {
    const { contentId, tenantId, archivedBy } = command;

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
    content.archive(archivedBy);

    // 4. Save aggregate (repository will publish domain events)
    await this.contentRepository.save(content);

    // Note: ContentArchivedEvent will be handled by:
    // - ContentReadModelProjection: Updates read model
    // - Future NotificationHandler: Removes from active lists
    // - Future AuditHandler: Logs archival in audit trail
  }
}
