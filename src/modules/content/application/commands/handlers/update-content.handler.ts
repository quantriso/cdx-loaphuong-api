import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CommandHandler } from '@nestjs/cqrs';
import { ICommandHandler } from '@core/application';
import { UpdateContentCommand } from '../update-content.command';
import type { IContentRepository } from '../../../domain/repositories';
import { CONTENT_REPOSITORY_TOKEN } from '../../../constants';
import { ContentCacheService } from '../../services/content-cache.service';
import { ContentValidatorService } from '../../../domain/services/content-validator.service';
import { ContentHistoryService } from '../../../domain/services/content-history.service';

/**
 * Update Content Command Handler
 *
 * Story 3.2: Update Content
 *
 * Business Rules:
 * - Content must exist and belong to the tenant
 * - User must be content author or admin
 * - DRAFT content can be edited normally
 * - REJECTED content can be edited, which resets it to DRAFT
 * - Published/archived content cannot be edited
 *
 * Implementation:
 * 1. Validate editing permissions using ContentValidatorService
 * 2. Handle REJECTED content - reset to DRAFT first
 * 3. Update content fields
 * 4. Update category, tags, featured image if provided
 * 5. Save to repository (emits ContentUpdatedEvent)
 * 6. Invalidate cache
 * 7. Log history using ContentHistoryService
 */
@CommandHandler(UpdateContentCommand)
@Injectable()
export class UpdateContentHandler implements ICommandHandler<
  UpdateContentCommand,
  void
> {
  constructor(
    @Inject(CONTENT_REPOSITORY_TOKEN)
    private readonly _contentRepository: IContentRepository,
    private readonly _contentCacheService: ContentCacheService,
    private readonly _contentValidatorService: ContentValidatorService,
    private readonly _contentHistoryService: ContentHistoryService,
  ) {}

  async execute(command: UpdateContentCommand): Promise<void> {
    // 1. Validate editing permissions using Domain Service
    const content = await this._contentValidatorService.validateCanEdit(
      command.contentId,
      command.tenantId,
      command.userId,
      command.isAdmin,
    );

    // Track metadata changes for event emission
    const metadataChanges: string[] = [];
    let contentFieldsUpdated = false;

    // 2. Handle REJECTED content - reset to DRAFT and allow editing
    if (content.isRejected()) {
      content.editRejectedContent(command.userId, {
        userId: command.userId,
      });
    }

    // 3. Update content fields
    if (
      command.title !== undefined ||
      command.content !== undefined ||
      command.excerpt !== undefined
    ) {
      // Track changes for history
      const oldTitle = content.title;
      const oldContent = content.content;
      const oldExcerpt = content.excerpt;

      content.updateContent(
        command.title !== undefined ? command.title : content.title,
        command.content !== undefined ? command.content : content.content,
        command.excerpt !== undefined ? command.excerpt : content.excerpt,
      );

      contentFieldsUpdated = true;

      // Log history for changed fields
      if (command.title !== undefined && command.title !== oldTitle) {
        await this._contentHistoryService.recordChange(
          command.contentId,
          'title',
          oldTitle,
          command.title,
          command.userId,
        );
      }

      if (command.content !== undefined && command.content !== oldContent) {
        await this._contentHistoryService.recordChange(
          command.contentId,
          'content',
          oldContent,
          command.content,
          command.userId,
        );
      }

      if (command.excerpt !== undefined && command.excerpt !== oldExcerpt) {
        await this._contentHistoryService.recordChange(
          command.contentId,
          'excerpt',
          oldExcerpt,
          command.excerpt,
          command.userId,
        );
      }
    }

    // 4. Update category if provided
    if (command.categoryId !== undefined) {
      const oldCategoryId = content.categoryId;
      content.setCategory(command.categoryId);
      metadataChanges.push('categoryId');

      // Log history
      if (command.categoryId !== oldCategoryId) {
        await this._contentHistoryService.recordChange(
          command.contentId,
          'categoryId',
          oldCategoryId,
          command.categoryId,
          command.userId,
        );
      }
    }

    // 5. Update tags if provided
    if (command.tags !== undefined) {
      const oldTags = [...content.tags]; // Copy array before modifying

      // Clear existing tags and add new ones
      for (const tag of oldTags) {
        content.removeTag(tag);
      }
      for (const tag of command.tags) {
        content.addTag(tag);
      }

      metadataChanges.push('tags');

      // Log history
      await this._contentHistoryService.recordChange(
        command.contentId,
        'tags',
        oldTags,
        command.tags,
        command.userId,
      );
    }

    // 6. Update featured image if provided
    if (command.featuredImage !== undefined) {
      const oldFeaturedImage = content.featuredImage;
      content.setFeaturedImage(command.featuredImage);
      metadataChanges.push('featuredImage');

      // Log history
      if (command.featuredImage !== oldFeaturedImage) {
        await this._contentHistoryService.recordChange(
          command.contentId,
          'featuredImage',
          oldFeaturedImage,
          command.featuredImage,
          command.userId,
        );
      }
    }

    // 7. Finalize metadata changes only if content fields weren't updated
    // (to avoid double-incrementing version)
    if (!contentFieldsUpdated && metadataChanges.length > 0) {
      content.finalizeMetadataChanges(command.userId, metadataChanges);
    }

    // 8. Save only if changes were made (events emitted)
    if (content.getDomainEvents().length > 0) {
      await this._contentRepository.save(content);

      // 9. Invalidate cache after successful update
      await this._contentCacheService.invalidateAllCaches(
        command.tenantId,
        command.contentId,
        content.status,
      );
    }
  }
}
