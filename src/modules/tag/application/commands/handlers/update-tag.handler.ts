import type { ICommandHandler } from '@core/application';
import { CommandHandler } from '@shared/cqrs';
import { Inject, Optional } from '@nestjs/common';
import { NotFoundException, type IRequestContextProvider } from '@core/common';
import { REQUEST_CONTEXT_TOKEN } from '@core/constants';
import { UpdateTagCommand } from '../update-tag.command';
import type { ITagRepository } from '../../../domain/repositories';
import { TAG_REPOSITORY_TOKEN } from '../../../constants/tokens';

/**
 * Update Tag Command Handler
 *
 * Story 4.3: Create, Edit, Delete Tags
 *
 * Handles updating existing tags.
 *
 * Business Flow:
 * 1. Load tag aggregate
 * 2. Verify tenant ownership
 * 3. Update aggregate
 * 4. Save aggregate (auto-publishes TagUpdatedEvent)
 *
 * CQRS Pattern:
 * - Command handler (write side)
 * - No return value needed
 * - Events published to event store
 */
@CommandHandler(UpdateTagCommand)
export class UpdateTagHandler implements ICommandHandler<
  UpdateTagCommand,
  void
> {
  constructor(
    @Inject(TAG_REPOSITORY_TOKEN)
    private readonly tagRepository: ITagRepository,
    @Optional()
    @Inject(REQUEST_CONTEXT_TOKEN)
    private readonly requestContext?: IRequestContextProvider,
  ) {}

  async execute(command: UpdateTagCommand): Promise<void> {
    const context = this.requestContext?.current();
    const eventMetadata = context
      ? {
          correlationId: context.correlationId,
          causationId: context.causationId,
          userId: context.userId,
        }
      : undefined;

    const {
      id,
      tenantId,
      name,
      description,
      color,
      category,
      synonyms,
      isActive,
      metadata,
      updatedBy,
    } = command;

    // Load aggregate
    const tag = await this.tagRepository.getById(id);

    if (!tag) {
      throw new NotFoundException('Tag', id);
    }

    // Verify tenant ownership
    if (tag.tenantId !== tenantId) {
      throw new NotFoundException('Tag', id);
    }

    // Update aggregate with event metadata
    tag.update(
      {
        name,
        description,
        color,
        category,
        synonyms,
        isActive,
        metadata,
      },
      updatedBy,
      eventMetadata,
    );

    // Save aggregate (repository will publish domain events)
    await this.tagRepository.save(tag);
  }
}
