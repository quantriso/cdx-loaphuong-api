import { Controller, Post, Body, Get, Query, Param } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateCommentCommand } from '../../application/commands/create-comment.command';
import { CreateCommentHandler } from '../../application/commands/handlers/create-comment.handler';
import { GetCommentsQuery } from '../../application/queries/get-comments.query';
import { GetCommentsHandler } from '../../application/queries/handlers/get-comments.handler';
import { CommentDto } from '../../application/dtos/comment.dto';

/**
 * Comment Controller
 *
 * Story 6.1: Add comments on published content
 *
 * HTTP endpoints for comment operations:
 * - POST /comments: Create a new comment
 * - GET /comments: Get paginated comments for content
 */
@Controller('comments')
export class CommentController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  /**
   * Create a new comment
   *
   * @param command - CreateCommentCommand with comment data
   * @returns Created comment
   */
  @Post()
  async createComment(
    @Body() command: CreateCommentCommand,
  ): Promise<CommentDto> {
    return this.commandBus.execute(command);
  }

  /**
   * Get comments for content
   *
   * @param contentId - Content ID to get comments for
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10)
   * @returns Paginated comments
   */
  @Get()
  async getComments(
    @Query('contentId') contentId: string,
    @Query('tenantId') tenantId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<{
    data: CommentDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const query = new GetCommentsQuery(contentId, tenantId, page, limit);
    const result = await this.queryBus.execute(query);

    return {
      data: result.comments,
      total: result.total,
      page,
      limit,
    };
  }

  /**
   * Get a specific comment by ID
   *
   * @param id - Comment ID
   * @returns Comment details
   */
  @Get(':id')
  async getCommentById(@Param('id') id: string): Promise<CommentDto> {
    // This would use a GetCommentByIdQuery
    // For now, we'll implement this in a future story
    throw new Error('Not implemented yet - will be added in future story');
  }
}
