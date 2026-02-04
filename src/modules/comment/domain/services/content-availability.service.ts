import { DomainException } from '@core/domain';

/**
 * Port: Content Availability Checker Interface
 *
 * Domain Layer defines the contract for cross-module validation.
 * This port allows the Comment bounded context to validate
 * content availability without depending on the Content module's infrastructure.
 *
 * Implementation will be provided by Infrastructure layer
 * via ContentAvailabilityChecker adapter.
 */
export interface IContentAvailabilityChecker {
  /**
   * Check if content is published
   *
   * @param contentId - ID of the content to check
   * @param tenantId - Tenant ID for multi-tenancy
   * @returns true if content exists and is published, false otherwise
   */
  isContentPublished(contentId: string, tenantId: string): Promise<boolean>;
}

/**
 * Domain Service: Content Availability Service
 *
 * Pure domain service that validates content availability constraints.
 * Uses the IContentAvailabilityChecker port to enforce business rules
 * without direct cross-module dependencies.
 */
export class ContentAvailabilityService {
  constructor(private readonly checker: IContentAvailabilityChecker) {}

  /**
   * Ensure content is published before allowing comments
   *
   * Business Rule: Comments can only be added to published content
   *
   * @param contentId - ID of the content
   * @param tenantId - Tenant ID
   * @throws DomainException if content is not published
   */
  async ensureContentIsPublished(
    contentId: string,
    tenantId: string,
  ): Promise<void> {
    const isPublished = await this.checker.isContentPublished(
      contentId,
      tenantId,
    );

    if (!isPublished) {
      throw this.createContentNotPublishedException(contentId);
    }
  }

  /**
   * Create domain exception for unpublished content
   *
   * @param contentId - ID of the unpublished content
   * @returns DomainException
   */
  private createContentNotPublishedException(
    contentId: string,
  ): DomainException {
    return new DomainException(
      `Cannot comment on unpublished content: ${contentId}`,
      'CONTENT_NOT_PUBLISHED',
    );
  }
}
