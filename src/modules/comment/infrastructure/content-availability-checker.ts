import { Injectable, Inject } from '@nestjs/common';
import type { IContentRepository } from '../../content/domain/repositories/content.repository.interface';
import { CONTENT_REPOSITORY_TOKEN } from '../../content/constants/tokens';
import type { IContentAvailabilityChecker } from '../domain/services/content-availability.service';

/**
 * Adapter: Content Availability Checker
 *
 * Infrastructure layer implementation of IContentAvailabilityChecker port.
 * This adapter provides cross-module validation by querying the Content module's repository.
 *
 * Architecture: Port-Adapter Pattern
 * - Port (Interface): IContentAvailabilityChecker (Domain Layer)
 * - Adapter (Implementation): ContentAvailabilityChecker (Infrastructure Layer)
 */
@Injectable()
export class ContentAvailabilityChecker implements IContentAvailabilityChecker {
  constructor(
    @Inject(CONTENT_REPOSITORY_TOKEN)
    private readonly contentRepository: IContentRepository,
  ) {}

  /**
   * Check if content is published
   *
   * Implementation of the port interface.
   * Queries the Content module's repository to check publication status.
   *
   * Performance Note: Uses repository getById() which may be optimized
   * with caching in the future. For high-traffic scenarios, consider
   * adding a distributed cache (Redis) for content status.
   *
   * @param contentId - ID of the content to check
   * @param tenantId - Tenant ID for multi-tenancy
   * @returns true if content exists and is published, false otherwise
   */
  async isContentPublished(
    contentId: string,
    tenantId: string,
  ): Promise<boolean> {
    try {
      const content = await this.contentRepository.getById(contentId);

      if (!content) {
        return false;
      }

      // Verify tenant isolation
      if (content.tenantId !== tenantId) {
        return false;
      }

      return content.status.isPublished();
    } catch (error) {
      // Log error but return false to fail gracefully
      // This prevents cascading errors if content module is unavailable
      console.error(
        `Error checking content availability for ${contentId}:`,
        error,
      );
      return false;
    }
  }
}
