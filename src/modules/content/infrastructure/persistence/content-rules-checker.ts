import { Injectable, Inject } from '@nestjs/common';
import { NotFoundException, DomainException } from '@core/common';
import type {
  IContentRulesChecker,
  ContentValidationContext,
} from '../../domain/services/content-validator.service';
import type { Content } from '../../domain/entities';
import type { IContentRepository } from '../../domain/repositories';
import { CONTENT_REPOSITORY_TOKEN } from '../../constants/tokens';

/**
 * Content Rules Checker Adapter (Infrastructure Implementation)
 *
 * Implements the IContentRulesChecker port interface.
 * Located in Infrastructure Layer as it depends on Repository.
 *
 * Responsibility:
 * - Validate content editing permissions
 * - Check content ownership and status
 * - Enforce business rules about who can edit what
 *
 * Story 3.7: Edit Draft Content
 */
@Injectable()
export class ContentRulesCheckerAdapter implements IContentRulesChecker {
  constructor(
    @Inject(CONTENT_REPOSITORY_TOKEN)
    private readonly _contentRepository: IContentRepository,
  ) {}

  /**
   * Validate that content can be edited
   *
   * @param context Validation context
   * @returns Content entity if validation passes
   * @throws DomainException if validation fails
   */
  async validateCanEdit(context: ContentValidationContext): Promise<Content> {
    const { contentId, tenantId, userId, isAdmin } = context;

    // 1. Load aggregate
    const content = await this._contentRepository.getById(contentId);

    if (!content) {
      throw new NotFoundException('Content', contentId);
    }

    // 2. Verify tenant ownership
    if (content.tenantId !== tenantId) {
      throw new DomainException(
        'Content does not belong to this tenant',
        'TENANT_MISMATCH',
        { contentId, tenantId },
      );
    }

    // 3. Check if user is authorized to edit
    const canEdit = this._checkEditAuthorization(content, userId, isAdmin);

    if (!canEdit) {
      throw new DomainException(
        'User is not authorized to edit this content',
        'UNAUTHORIZED_EDIT',
        { contentId, userId, isAdmin },
      );
    }

    // 4. Check content status (only DRAFT and REJECTED can be edited)
    const currentStatus = content.status.toString();

    if (currentStatus !== 'DRAFT' && currentStatus !== 'REJECTED') {
      throw new DomainException(
        `Cannot edit content with status ${currentStatus}. Only DRAFT and REJECTED can be edited.`,
        'INVALID_STATUS_FOR_EDIT',
        { contentId, status: currentStatus },
      );
    }

    return content;
  }

  /**
   * Check if content can be edited (non-throwing version)
   *
   * @param context Validation context
   * @returns true if can edit, false otherwise
   */
  async canEdit(context: ContentValidationContext): Promise<boolean> {
    try {
      await this.validateCanEdit(context);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if user is authorized to edit the content
   *
   * @param content Content entity
   * @param userId User ID
   * @param isAdmin Whether user is admin
   * @returns true if authorized, false otherwise
   */
  private _checkEditAuthorization(
    content: Content,
    userId: string,
    isAdmin: boolean,
  ): boolean {
    // Admins can edit any content
    if (isAdmin) {
      return true;
    }

    // Content author can edit their own content
    // Assuming content entity has authorId property
    if ('authorId' in content && content.authorId === userId) {
      return true;
    }

    return false;
  }
}
