import type { ICommandHandler } from '@core/application';
import { CommandHandler } from '@shared/cqrs';
import { Inject, Optional } from '@nestjs/common';
import {
  ConflictException,
  type IRequestContextProvider,
} from '@core/common';
import { REQUEST_CONTEXT_TOKEN } from '@core/constants';
import { CreateTagCommand } from '../create-tag.command';
import { Tag, TagId } from '../../../domain';
import type { ITagRepository } from '../../../domain/repositories';
import { TAG_REPOSITORY_TOKEN } from '../../../constants/tokens';

/**
 * Create Tag Command Handler
 *
 * Story 4.3: Create, Edit, Delete Tags
 *
 * Handles creation of new tags.
 *
 * Business Flow:
 * 1. Generate slug from tag name
 * 2. Validate slug is unique within tenant
 * 3. Create Tag aggregate
 * 4. Save aggregate (auto-publishes TagCreatedEvent)
 * 5. Return tag ID
 *
 * CQRS Pattern:
 * - Command handler (write side)
 * - Returns tag ID for reference
 * - Events published to event store
 */
@CommandHandler(CreateTagCommand)
export class CreateTagHandler implements ICommandHandler<
  CreateTagCommand,
  string
> {
  constructor(
    @Inject(TAG_REPOSITORY_TOKEN)
    private readonly tagRepository: ITagRepository,
    @Optional()
    @Inject(REQUEST_CONTEXT_TOKEN)
    private readonly requestContext?: IRequestContextProvider,
  ) {}

  async execute(command: CreateTagCommand): Promise<string> {
    const tagId = TagId.generate();

    const context = this.requestContext?.current();
    const eventMetadata = context
      ? {
          correlationId: context.correlationId,
          causationId: context.causationId,
          userId: context.userId,
        }
      : undefined;

    const {
      tenantId,
      name,
      category,
      description,
      color,
      synonyms,
      metadata,
      createdBy,
    } = command;

    // Generate slug from name
    const slug = this.generateSlug(name);

    // Check if tag slug already exists within tenant
    const existingTag = await this.tagRepository.findBySlug(tenantId, slug);

    if (existingTag) {
      throw new ConflictException(
        `Tag with name '${name}' already exists (slug: ${slug})`,
      );
    }

    // Create tag aggregate with event metadata
    const tag = Tag.create(
      tagId,
      {
        tenantId,
        name,
        slug,
        description,
        color,
        category,
        synonyms: synonyms || [],
        isActive: true, // Default to active
        usageCount: 0, // Initial usage count
        metadata,
      },
      createdBy,
      eventMetadata,
    );

    // Save aggregate (repository will publish domain events)
    await this.tagRepository.save(tag);

    return tagId.value;
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
