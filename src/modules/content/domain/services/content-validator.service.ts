import { Inject } from '@nestjs/common';
import { DomainException } from '@core/common';
import { CONTENT_RULES_CHECKER_TOKEN } from '../../constants/tokens';
import type { Content } from '../entities';

/**
 * Content Validation Context
 *
 * Context information for validation
 */
export interface ContentValidationContext {
  contentId: string;
  tenantId: string;
  userId: string;
  isAdmin: boolean;
}

/**
 * Content Rules Checker Interface (Port)
 *
 * Interface cho việc kiểm tra các business rules của Content.
 * Được định nghĩa ở Domain Layer.
 * Infrastructure Layer sẽ implement.
 */
export interface IContentRulesChecker {
  /**
   * Validate that content can be edited
   *
   * @param context Validation context
   * @returns Content entity if validation passes
   * @throws DomainException if validation fails
   */
  validateCanEdit(context: ContentValidationContext): Promise<Content>;

  /**
   * Check if content can be edited (non-throwing version)
   *
   * @param context Validation context
   * @returns true if can edit, false otherwise
   */
  canEdit(context: ContentValidationContext): Promise<boolean>;
}

/**
 * Content Validator Service
 *
 * Domain Service đảm bảo business rules:
 * - Content must exist and belong to the tenant
 * - User must be content author or admin
 * - Content must be in DRAFT or REJECTED status to edit
 * - PENDING, APPROVED, PUBLISHED, ARCHIVED cannot be edited
 *
 * Tại sao đây là Domain Service?
 * - Business rules về editing permissions thuộc về Domain
 * - Logic này không thuộc về một Aggregate cụ thể
 * - Cần truy query database để validate → sử dụng Port interface
 *
 * Exception Strategy:
 * - Uses DomainException for validation failures
 * - Uses ConflictException for authorization issues (HTTP 409)
 *
 * Story 3.7: Edit Draft Content
 *
 * @example
 * ```typescript
 * // Trong Command Handler
 * const validatorService = new ContentValidatorService(rulesChecker);
 * await validatorService.validateCanEdit(contentId, tenantId, userId, isAdmin);
 * ```
 */
export class ContentValidatorService {
  constructor(
    @Inject(CONTENT_RULES_CHECKER_TOKEN)
    private readonly checker: IContentRulesChecker,
  ) {}

  /**
   * Validate that content can be edited
   *
   * @param contentId Content ID
   * @param tenantId Tenant ID for ownership verification
   * @param userId User ID attempting to edit
   * @param isAdmin Whether user is an admin
   * @returns Content entity if validation passes
   * @throws DomainException if validation fails
   */
  async validateCanEdit(
    contentId: string,
    tenantId: string,
    userId: string,
    isAdmin: boolean = false,
  ): Promise<Content> {
    const context: ContentValidationContext = {
      contentId,
      tenantId,
      userId,
      isAdmin,
    };

    // Use the port interface to validate
    return await this.checker.validateCanEdit(context);
  }

  /**
   * Check if content can be edited (non-throwing version)
   *
   * @param contentId Content ID
   * @param tenantId Tenant ID
   * @param userId User ID
   * @param isAdmin Whether user is admin
   * @returns true if can edit, false otherwise
   */
  async canEdit(
    contentId: string,
    tenantId: string,
    userId: string,
    isAdmin: boolean = false,
  ): Promise<boolean> {
    const context: ContentValidationContext = {
      contentId,
      tenantId,
      userId,
      isAdmin,
    };

    return await this.checker.canEdit(context);
  }
}
