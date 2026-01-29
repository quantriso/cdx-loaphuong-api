import { Injectable, Inject } from '@nestjs/common';
import { IQueryHandler } from 'src/libs/core/application';
import { QueryHandler } from 'src/libs/shared/cqrs';
import { ListContentsQuery } from '../list-contents.query';
import { ContentResponseDto } from '../../dtos';
import { PaginatedResponseDto } from 'src/libs/shared/http/dtos/pagination.dto';
import type { IContentReadDao } from '../ports';
import { CONTENT_READ_DAO_TOKEN } from '../../../constants/tokens';

/**
 * List Contents Query Handler
 *
 * Story 4.5: Filter Content by Category & Tags
 *
 * Handles retrieving filtered and paginated list of contents.
 * Supports filtering by category, tags, date range, type, author, and status.
 * Supports sorting by various fields.
 *
 * ## Tag Filtering Logic
 * - Tags use AND logic: content must have ALL specified tags
 * - If tags = ['covid', 'health'], only content with BOTH tags is returned
 *
 * ## CQRS Pattern
 * - Query Handler (Read Side)
 * - Uses IContentReadDao for optimized read operations
 * - Returns DTOs (never domain entities)
 */
@QueryHandler(ListContentsQuery)
@Injectable()
export class ListContentsHandler
  implements IQueryHandler<ListContentsQuery, PaginatedResponseDto<ContentResponseDto>>
{
  constructor(
    @Inject(CONTENT_READ_DAO_TOKEN)
    private readonly contentReadDao: IContentReadDao,
  ) {}

  async execute(
    query: ListContentsQuery,
  ): Promise<PaginatedResponseDto<ContentResponseDto>> {
    return this.contentReadDao.listContents(query.tenantId, {
      page: query.page,
      limit: query.limit,
      category: query.category,
      tags: query.tags,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      type: query.type,
      authorId: query.authorId,
      status: query.status,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }
}
