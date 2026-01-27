import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { NotFoundException } from '@core/common';
import type { IContentRepository } from '../../../domain/repositories';
import type { ContentHistoryService } from '../../../domain/services';
import { GetContentHistoryQuery } from '../get-content-history.query';
import {
  GetContentHistoryResponseDto,
  ContentHistoryEntryDto,
} from '../../dtos/content-history-response.dto';
import { CONTENT_REPOSITORY_TOKEN } from '../../../constants/tokens';

/**
 * Get Content History Query Handler
 *
 * Story 3.9: View Content History
 *
 * Handles retrieval of content change history.
 *
 * Business Flow:
 * 1. Validate content exists and belongs to tenant
 * 2. Retrieve history entries via ContentHistoryService
 * 3. Transform to DTOs and return
 *
 * CQRS Pattern:
 * - Query handler (read side)
 * - Returns DTOs (not domain entities)
 * - Uses domain service for business logic
 */
@QueryHandler(GetContentHistoryQuery)
export class GetContentHistoryHandler
  implements
    IQueryHandler<GetContentHistoryQuery, GetContentHistoryResponseDto>
{
  constructor(
    @Inject(CONTENT_REPOSITORY_TOKEN)
    private readonly contentRepository: IContentRepository,
    private readonly historyService: ContentHistoryService,
  ) {}

  async execute(
    query: GetContentHistoryQuery,
  ): Promise<GetContentHistoryResponseDto> {
    const { contentId, tenantId, limit } = query;

    // 1. Validate content exists and belongs to tenant
    const content = await this.contentRepository.getById(contentId);

    if (!content) {
      throw new NotFoundException('Content', contentId);
    }

    if (content.tenantId !== tenantId) {
      throw new NotFoundException('Content', contentId);
    }

    // 2. Retrieve history entries
    const historyEntries = await this.historyService.getHistory(
      contentId,
      limit,
    );

    // 3. Transform to DTOs
    const entries: ContentHistoryEntryDto[] = historyEntries.map((entry) => ({
      id: entry.id,
      contentId: entry.contentId,
      field: entry.field,
      oldValue: entry.oldValue,
      newValue: entry.newValue,
      userId: entry.userId,
      timestamp: entry.timestamp,
    }));

    return {
      contentId,
      entries,
      total: entries.length,
    };
  }
}
