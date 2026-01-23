import { Injectable, Inject, NotFoundException, BadRequestException } from "@nestjs/common";
import { CommandHandler } from "@nestjs/cqrs";
import { ICommandHandler } from "@core/application";
import { UpdateContentCommand } from "../update-content.command";
import type { IContentRepository } from "../../../domain/repositories";
import { CONTENT_REPOSITORY_TOKEN } from "../../../constants";

/**
 * Update Content Command Handler
 *
 * Story 3.2: Update Content
 *
 * Business Rules:
 * - Content must exist and belong to the tenant
 * - DRAFT content can be edited normally
 * - REJECTED content can be edited, which resets it to DRAFT
 * - Published/archived content cannot be edited
 *
 * Implementation:
 * 1. Fetch content by ID with tenant verification
 * 2. Check if REJECTED - if so, reset to DRAFT first
 * 3. Update content fields
 * 4. Update category, tags, featured image if provided
 * 5. Save to repository (emits ContentUpdatedEvent)
 */
@CommandHandler(UpdateContentCommand)
@Injectable()
export class UpdateContentHandler
  implements ICommandHandler<UpdateContentCommand, void>
{
  constructor(
    @Inject(CONTENT_REPOSITORY_TOKEN)
    private readonly contentRepository: IContentRepository
  ) {}

  async execute(command: UpdateContentCommand): Promise<void> {
    // 1. Fetch content with tenant verification
    const content = await this.contentRepository.getById(command.contentId);

    if (!content) {
      throw new NotFoundException(
        `Content with id ${command.contentId} not found`
      );
    }

    // Verify tenant ownership (security: prevent cross-tenant access)
    if (content.tenantId !== command.tenantId) {
      throw new NotFoundException(
        `Content with id ${command.contentId} not found`
      );
    }

    // Track metadata changes for event emission
    const metadataChanges: string[] = [];
    let contentFieldsUpdated = false;

    // 2. Handle REJECTED content - reset to DRAFT and allow editing
    if (content.isRejected()) {
      content.editRejectedContent(command.userId, {
        userId: command.userId,
      });
    } else if (!content.canEdit()) {
      throw new BadRequestException(
        `Cannot edit content that is not in DRAFT status. Current status: ${content.status.toString()}`
      );
    }

    // 3. Update content fields
    if (command.title !== undefined || command.content !== undefined || command.excerpt !== undefined) {
      content.updateContent(
        command.title !== undefined ? command.title : content.title,
        command.content !== undefined ? command.content : content.content,
        command.excerpt !== undefined ? command.excerpt : content.excerpt
      );
      contentFieldsUpdated = true;
    }

    // 4. Update category if provided
    if (command.categoryId !== undefined) {
      content.setCategory(command.categoryId);
      metadataChanges.push('categoryId');
    }

    // 5. Update tags if provided
    if (command.tags !== undefined) {
      // Clear existing tags and add new ones
      const existingTags = [...content.tags]; // Copy array before modifying
      for (const tag of existingTags) {
        content.removeTag(tag);
      }
      for (const tag of command.tags) {
        content.addTag(tag);
      }
      metadataChanges.push('tags');
    }

    // 6. Update featured image if provided
    if (command.featuredImage !== undefined) {
      content.setFeaturedImage(command.featuredImage);
      metadataChanges.push('featuredImage');
    }

    // 7. Finalize metadata changes only if content fields weren't updated
    // (to avoid double-incrementing version)
    if (!contentFieldsUpdated && metadataChanges.length > 0) {
      content.finalizeMetadataChanges(command.userId, metadataChanges);
    }

    // 8. Save only if changes were made (events emitted)
    if (content.getDomainEvents().length > 0) {
      await this.contentRepository.save(content);
    }
  }
}
