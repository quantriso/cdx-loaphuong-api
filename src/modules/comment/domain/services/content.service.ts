import { Injectable } from '@nestjs/common';
import type { IContentRepository } from '../../../content/domain/repositories/content.repository.interface';

/**
 * Content Service
 *
 * Domain service for validating content-related operations.
 * Provides methods to check if content is published and enforce rate limiting.
 */
@Injectable()
export class ContentService {
  constructor(private readonly contentRepository: IContentRepository) {}

  /**
   * Check if content is published
   * Comments can only be added to published content
   */
  async isContentPublished(contentId: string): Promise<boolean> {
    const content = await this.contentRepository.getById(contentId);
    if (!content) {
      return false;
    }
    return content.status.isPublished();
  }

  /**
   * Check rate limit for user
   * Prevents spam by limiting comment creation frequency
   * Default: 5 comments per minute
   */
  async checkRateLimit(userId: string, tenantId: string): Promise<boolean> {
    // TODO: Implement rate limiting with Redis or in-memory cache
    // For now, return false (no rate limit)
    return false;
  }
}
