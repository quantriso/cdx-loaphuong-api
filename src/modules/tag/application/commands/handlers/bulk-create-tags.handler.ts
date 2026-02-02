import { Inject, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ICommandHandler } from 'src/libs/core/application';
import { CommandHandler } from 'src/libs/shared/cqrs';
import { BulkCreateTagsCommand } from '../bulk-create-tags.command';
import { BulkTagsResponseDto } from '../../dtos/bulk-tags-response.dto';
import type { ITagRepository } from '../../../domain/repositories/tag.repository.interface';
import { TAG_REPOSITORY_TOKEN } from '../../../constants/tokens';
import {
  Tag,
  TagCategory,
  TagProps,
} from '../../../domain/entities/tag.entity';
import { TagId } from '../../../domain/value-objects/tag-id.value-object';
import type { IUnitOfWork, IEventBus } from 'src/libs/core/infrastructure';
import { DomainException } from 'src/libs/core/common';
import { EVENT_BUS_TOKEN, UNIT_OF_WORK_TOKEN } from 'src/libs/shared';
import { BulkTagsCreatedEvent } from '../../../domain/events/bulk-tags-created.event';

/**
 * Bulk Create Tags Handler
 *
 * Story 4.4: Bulk Create Tags
 *
 * Creates multiple tags at once with:
 * - Transaction management for atomicity
 * - Duplicate detection (skip existing tags)
 * - Validation for each tag
 * - Summary response (created, skipped, failed)
 * - Partial success support (best-effort)
 *
 * Business Rules:
 * - Maximum 100 tags per request
 * - Duplicate tags (same slug within tenant) are skipped
 * - Invalid tags fail individually without affecting other tags
 * - Operation continues even if some tags fail
 */
@CommandHandler(BulkCreateTagsCommand)
export class BulkCreateTagsHandler implements ICommandHandler<
  BulkCreateTagsCommand,
  BulkTagsResponseDto
> {
  private readonly logger = new Logger(BulkCreateTagsHandler.name);

  constructor(
    @Inject(TAG_REPOSITORY_TOKEN)
    private readonly tagRepository: ITagRepository,
    @Inject(UNIT_OF_WORK_TOKEN)
    private readonly unitOfWork: IUnitOfWork,
    @Inject(EVENT_BUS_TOKEN)
    private readonly eventBus: IEventBus,
  ) {}

  async execute(command: BulkCreateTagsCommand): Promise<BulkTagsResponseDto> {
    const { tags, tenantId, userId } = command;

    this.logger.log(
      `Executing bulk tag creation for ${tags.length} tags in tenant ${tenantId}`,
    );

    // Initialize response
    const response: BulkTagsResponseDto = {
      created: 0,
      skipped: 0,
      failed: 0,
      skippedTags: [],
      failedTags: [],
    };

    const createdTagIds: string[] = [];

    // Use Unit of Work for transaction management
    await this.unitOfWork.runInTransaction(async (ctx) => {
      for (const tagData of tags) {
        try {
          // Step 1: Generate slug from name
          const slug = this.generateSlug(tagData.name);

          // Step 2: Check for duplicates (skip if exists)
          const existing = await this.tagRepository.findBySlug(tenantId, slug);
          if (existing) {
            response.skipped++;
            response.skippedTags!.push({
              name: tagData.name,
              reason: `Tag with slug "${slug}" already exists`,
            });
            this.logger.debug(
              `Skipping tag "${tagData.name}" - slug "${slug}" already exists`,
            );
            continue;
          }

          // Step 3: Validate and create tag
          const tagId = new TagId(randomUUID());

          // Prepare tag props with defaults
          const category = tagData.category
            ? TagCategory[tagData.category as keyof typeof TagCategory] ||
              TagCategory.GENERAL
            : TagCategory.GENERAL;

          const tagProps: TagProps = {
            name: tagData.name,
            slug, // Will be set by Tag.create()
            color: tagData.color,
            category,
            synonyms: tagData.synonyms || [],
            description: undefined,
            isActive: true,
            usageCount: 0,
            metadata: {},
            tenantId,
          };

          // Create tag aggregate
          const tag = Tag.create(tagId, tagProps, userId);

          // Step 4: Save tag (within transaction context)
          await this.tagRepository.save(tag, ctx);

          response.created++;
          createdTagIds.push(tag.id);
          this.logger.debug(
            `Created tag "${tagData.name}" with slug "${slug}"`,
          );
        } catch (error) {
          // Step 5: Handle individual tag failures
          response.failed++;
          response.failedTags!.push({
            name: tagData.name,
            reason: this.extractErrorMessage(error),
          });
          this.logger.warn(
            `Failed to create tag "${tagData.name}": ${this.extractErrorMessage(error)}`,
          );
        }
      }
    });

    // Emit bulk operation event for audit logging
    if (response.created > 0 || response.skipped > 0 || response.failed > 0) {
      const event = new BulkTagsCreatedEvent(
        createdTagIds[0] || randomUUID(), // Use first created tag ID or generate new ID
        {
          tenantId,
          userId,
          created: response.created,
          skipped: response.skipped,
          failed: response.failed,
          timestamp: new Date(),
          tagIds: createdTagIds,
        },
      );

      await this.eventBus.publish(event);
      this.logger.log(`Published BulkTagsCreatedEvent for tenant ${tenantId}`);
    }

    this.logger.log(
      `Bulk tag creation completed: ${response.created} created, ${response.skipped} skipped, ${response.failed} failed`,
    );

    return response;
  }

  /**
   * Generate slug from name
   * Converts to lowercase and replaces spaces/special chars with hyphens
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Extract error message from error object
   */
  private extractErrorMessage(error: unknown): string {
    if (error instanceof DomainException) {
      return error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Unknown error occurred';
  }
}
