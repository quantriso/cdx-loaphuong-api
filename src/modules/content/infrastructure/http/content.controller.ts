import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Inject,
  Req,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from "@nestjs/swagger";
import type { ICommandBus, IQueryBus } from "@core/application";
import { COMMAND_BUS_TOKEN, QUERY_BUS_TOKEN } from "@core/constants";
import { CreateContentDto, UpdateContentDto, ContentResponseDto } from "../../application/dtos";
import { CreateContentCommand, UpdateContentCommand } from "../../application/commands";
import { GetContentQuery } from "../../application/queries";

/**
 * Content Controller
 *
 * Story 3.1: Create Content Draft
 * Story 3.2: Update Content
 *
 * HTTP endpoints for content management following CQRS pattern.
 * - Write operations (POST, PATCH) → Command Bus
 * - Read operations (GET) → Query Bus
 */
@ApiTags("contents")
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
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Create content draft",
    description: "Creates a new content in DRAFT status and emits ContentCreatedEvent",
  })
  @ApiResponse({
    status: 201,
    description: "Content draft created successfully",
    schema: {
      example: {
        id: "550e8400-e29b-41d4-a716-446655440000",
        message: "Content draft created successfully",
      },
    },
  })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiBody({ type: CreateContentDto })
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
  @ApiOperation({
    summary: "Get content by ID",
    description: "Retrieves a single content by its ID. Uses caching for performance.",
  })
  @ApiParam({ name: "id", description: "Content ID (UUID)" })
  @ApiResponse({
    status: 200,
    description: "Content found",
    type: ContentResponseDto,
  })
  @ApiResponse({ status: 404, description: "Content not found" })
  async getContent(
    @Param("id") id: string,
    @Req() req: any
  ) {
    // Extract tenant from request (will be set by auth middleware)
    const tenantId = req.user?.tenantId || "mock-tenant-id";

    const query = new GetContentQuery(id, tenantId);

    return this.queryBus.execute<GetContentQuery>(query);
  }

  /**
   * Update content
   *
   * Story 3.2: Update Content - Write Side
   * PATCH /api/v1/contents/:id
   *
   * Business Rules:
   * - DRAFT content can be updated
   * - REJECTED content can be updated (resets to DRAFT)
   * - Published/archived content cannot be updated
   */
  @Patch(":id")
  @ApiOperation({
    summary: "Update content",
    description: "Updates content fields and emits ContentUpdatedEvent. Only DRAFT and REJECTED content can be updated.",
  })
  @ApiParam({ name: "id", description: "Content ID (UUID)" })
  @ApiResponse({
    status: 200,
    description: "Content updated successfully",
    schema: {
      example: {
        message: "Content updated successfully",
      },
    },
  })
  @ApiResponse({ status: 400, description: "Cannot update content in current status" })
  @ApiResponse({ status: 404, description: "Content not found" })
  @ApiBody({ type: UpdateContentDto })
  async updateContent(
    @Param("id") id: string,
    @Body() dto: UpdateContentDto,
    @Req() req: any
  ): Promise<{ message: string }> {
    // Extract tenant and user from request (will be set by auth middleware)
    const tenantId = req.user?.tenantId || "mock-tenant-id";
    const userId = req.user?.id || "mock-user-id";

    // Create command with only provided fields (rest will be undefined)
    const command = new UpdateContentCommand(
      id,
      tenantId,
      userId,
      dto.title,
      dto.content,
      dto.excerpt,
      dto.categoryId,
      dto.featuredImage,
      dto.tags
    );

    await this.commandBus.execute(command);

    return {
      message: "Content updated successfully",
    };
  }
}
