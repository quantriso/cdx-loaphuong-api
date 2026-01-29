import { Injectable, Inject } from '@nestjs/common';
import { IQueryHandler } from 'src/libs/core/application';
import { QueryHandler } from 'src/libs/shared/cqrs';
import { GetContentQuery } from '../get-content.query';
import { ContentResponseDto } from '../../dtos';
import type { IContentReadDao } from '../ports';
import { CONTENT_READ_DAO_TOKEN } from '../../../constants/tokens';
import { NotFoundException } from 'src/libs/core/common';

/**
 * Get Content Query Handler
 *
 * Story 3.1: Create Content Draft - Read Side
 * Handles retrieving content by ID
 */
@QueryHandler(GetContentQuery)
@Injectable()
export class GetContentHandler implements IQueryHandler<
  GetContentQuery,
  ContentResponseDto
> {
  constructor(
    @Inject(CONTENT_READ_DAO_TOKEN)
    private readonly contentReadDao: IContentReadDao,
  ) {}

  async execute(query: GetContentQuery): Promise<ContentResponseDto> {
    const content = await this.contentReadDao.findById(
      query.id,
      query.tenantId,
    );

    if (!content) {
      throw new NotFoundException(`Content with ID ${query.id} not found`);
    }

    return content;
  }
}
