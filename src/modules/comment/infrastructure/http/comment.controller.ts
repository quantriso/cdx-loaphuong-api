import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Param,
  Delete,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateCommentCommand } from '../../application/commands/create-comment.command';
import { VoteCommentCommand } from '../../application/commands/vote-comment.command';
import { RemoveVoteCommand } from '../../application/commands/remove-vote.command';
import { CreateCommentHandler } from '../../application/commands/handlers/create-comment.handler';
import { GetCommentsQuery } from '../../application/queries/get-comments.query';
import { GetCommentByIdQuery } from '../../application/queries/get-comment-by-id.query';
import { GetCommentVotesQuery } from '../../application/queries/get-comment-votes.query';
import { GetUserVoteForCommentQuery } from '../../application/queries/get-user-vote-for-comment.query';
import { GetCommentsHandler } from '../../application/queries/handlers/get-comments.handler';
import { GetCommentByIdHandler } from '../../application/queries/handlers/get-comment-by-id.handler';
import { GetCommentVotesHandler } from '../../application/queries/handlers/get-comment-votes.handler';
import { GetUserVoteForCommentHandler } from '../../application/queries/handlers/get-user-vote-for-comment.handler';
import { CommentDto } from '../../application/dtos/comment.dto';
import { CommentVoteDto } from '../../application/dtos/comment-vote.dto';

/**
 * Comment Controller
 *
 * Story 6.1: Add comments on published content
 * Story 6.2: Reply to comment
 * Story 6.3: Like/dislike comment
 *
 * HTTP endpoints for comment operations:
 * - POST /comments: Create a new comment
 * - GET /comments: Get paginated comments for content
 * - POST /comments/:id/vote: Vote on a comment (like/dislike)
 * - DELETE /comments/:id/vote: Remove vote from a comment
 * - GET /comments/:id: Get a specific comment by ID
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
   * Vote on a comment (like/dislike)
   *
   * Story 6.3: Like/dislike comment
   *
   * @param id - Comment ID to vote on
   * @param command - VoteCommentCommand with vote type
   * @returns Updated comment with vote status and counts
   */
  @Post(':id/vote')
  async voteComment(
    @Param('id') id: string,
    @Body() command: { userId: string; voteType: string },
  ): Promise<{
    comment: CommentDto;
    voted: boolean;
    voteType: 'LIKE' | 'DISLIKE';
  }> {
    const voteCommand = new VoteCommentCommand(
      id,
      command.userId,
      command.voteType as any,
    );
    return this.commandBus.execute(voteCommand);
  }

  /**
   * Remove vote from a comment
   *
   * @param id - Comment ID to remove vote from
   * @param command - RemoveVoteCommand with voter ID
   * @returns Updated comment with vote counts
   */
  @Delete(':id/vote')
  async removeVote(
    @Param('id') id: string,
    @Body() command: { userId: string },
  ): Promise<CommentDto> {
    const removeCommand = new RemoveVoteCommand(id, command.userId);
    return this.commandBus.execute(removeCommand);
  }

  /**
   * Get a specific comment by ID
   *
   * @param id - Comment ID
   * @returns Comment details
   */
  @Get(':id')
  async getCommentById(@Param('id') id: string): Promise<CommentDto> {
    const query = new GetCommentByIdQuery(id);
    return this.queryBus.execute(query);
  }

  /**
   * Get all votes for a comment
   *
   * Story 6.3: Like/dislike comment
   *
   * @param id - Comment ID to get votes for
   * @returns List of votes with vote type and user info
   */
  @Get(':id/votes')
  async getCommentVotes(@Param('id') id: string): Promise<CommentVoteDto[]> {
    const query = new GetCommentVotesQuery(id);
    return this.queryBus.execute(query);
  }

  /**
   * Get a specific user's vote for a comment
   *
   * Story 6.3: Like/dislike comment
   *
   * @param id - Comment ID
   * @param userId - User ID to check vote for
   * @returns User's vote or null if not voted
   */
  @Get(':id/vote/user/:userId')
  async getUserVoteForComment(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ): Promise<CommentVoteDto | null> {
    const query = new GetUserVoteForCommentQuery(id, userId);
    return this.queryBus.execute(query);
  }
}
