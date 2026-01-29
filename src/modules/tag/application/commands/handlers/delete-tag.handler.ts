import type { ICommandHandler } from '@core/application';
import { CommandHandler } from '@shared/cqrs';
import { Inject, Optional } from '@nestjs/common';
import { NotFoundException, type IRequestContextProvider } from '@core/common';
import { REQUEST_CONTEXT_TOKEN } from '@core/constants';
import { DeleteTagCommand } from '../delete-tag.command';
import type { ITagRepository } from '../../../domain/repositories';
import { TAG_REPOSITORY_TOKEN } from '../../../constants/tokens';

/**
 * Delete Tag Command Handler
 *
 * Story 4.3: Create, Edit, Delete Tags
 *
 * Handles soft deletion of tags.
 *
 * Business Flow:
 * 1. Load tag aggregate
 * 2. Verify tenant ownership
 * 3. Mark tag as deleted
 * 4. Save aggregate (auto-publishes TagDeletedEvent)
 *
 * CQRS Pattern:
 * - Command handler (write side)
 * - No return value needed
 * - Events published to event store
 */
@CommandHandler(DeleteTagCommand)
export class DeleteTagHandler implements ICommandHandler<
  DeleteTagCommand,
  void
> {
  constructor(
    @Inject(TAG_REPOSITORY_TOKEN)
    private readonly tagRepository: ITagRepository,
    @Optional()
    @Inject(REQUEST_CONTEXT_TOKEN)
    private readonly requestContext?: IRequestContextProvider,
  ) {}

  async execute(command: DeleteTagCommand): Promise<void> {
    const context = this.requestContext?.current();
    const eventMetadata = context
      ? {
          correlationId: context.correlationId,
          causationId: context.causationId,
          userId: context.userId,
        }
      : undefined;

    const { id, tenantId, deletedBy, force } = command;

    // Load aggregate
    const tag = await this.tagRepository.getById(id);

    if (!tag) {
      throw new NotFoundException('Tag', id);
    }

    // Verify tenant ownership
    if (tag.tenantId !== tenantId) {
      throw new NotFoundException('Tag', id);
    }

    // Mark as deleted with event metadata
    tag.markAsDeleted(deletedBy, force, eventMetadata);

    // Save aggregate (repository will publish domain events)
    await this.tagRepository.save(tag);
  }
}
