import { Controller, Post, Get, Body, Param, Inject, Req } from "@nestjs/common";
import type { ICommandBus, IQueryBus } from "@core/application";
import { COMMAND_BUS_TOKEN, QUERY_BUS_TOKEN } from "@core/constants";
import { CreateContentDto, ContentResponseDto } from "../../application/dtos";
import { CreateContentCommand } from "../../application/commands";
import { GetContentQuery } from "../../application/queries";

/**
 * Content Controller
 *
 * Story 3.1: Create Content Draft
 * HTTP endpoints for content management
 */
@Controller("api/v1/contents")
export class ContentController {
  constructor(
    @Inject(COMMAND_BUS_TOKEN)
    private readonly commandBus: ICommandBus,
    @Inject(QUERY_BUS_TOKEN)
    private readonly queryBus: IQueryBus
  ) {}

  /**
   * Create new content draft
   *
   * Story 3.1: Create Content Draft - Write Side
   * POST /api/v1/contents
   */
  @Post()
  async createContent(
    @Body() dto: CreateContentDto,
    @Req() req: any
  ): Promise<{ id: string; message: string }> {
    // Extract tenant and user from request (will be set by auth middleware)
    const tenantId = req.user?.tenantId || "mock-tenant-id";
    const authorId = req.user?.id || "mock-author-id";

    const command = new CreateContentCommand(
      tenantId,
      authorId,
      dto.title,
      dto.content,
      dto.type,
      dto.excerpt,
      dto.priority,
      dto.categoryId,
      dto.tags,
      dto.featuredImage
    );

    const contentId = await this.commandBus.execute<CreateContentCommand>(command);

    return {
      id: contentId,
      message: "Content draft created successfully",
    };
  }

  /**
   * Get content by ID
   *
   * Story 3.1: Create Content Draft - Read Side
   * GET /api/v1/contents/:id
   */
  @Get(":id")
  async getContent(
    @Param("id") id: string,
    @Req() req: any
  ) {
    // Extract tenant from request (will be set by auth middleware)
    const tenantId = req.user?.tenantId || "mock-tenant-id";

    const query = new GetContentQuery(id, tenantId);

    return this.queryBus.execute<GetContentQuery>(query);
  }
}
