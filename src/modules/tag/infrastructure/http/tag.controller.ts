import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Inject,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import type { ICommandBus, IQueryBus } from '@core/application';
import { COMMAND_BUS_TOKEN, QUERY_BUS_TOKEN } from '@core/constants';
import { CreateTagDto, UpdateTagDto } from '../dtos';
import { TagResponseDto } from '../../application/dtos';
import {
  CreateTagCommand,
  UpdateTagCommand,
  DeleteTagCommand,
} from '../../application/commands';
import { GetTagQuery, ListTagsQuery } from '../../application/queries';

/**
 * Tag Controller
 *
 * Story 4.3: Create, Edit, Delete Tags
 *
 * HTTP endpoints for tag management following CQRS pattern.
 * - Write operations (POST, PATCH, DELETE) → Command Bus
 * - Read operations (GET) → Query Bus
 */
@ApiTags('tags')
@Controller('api/v1/tags')
export class TagController {
  constructor(
    @Inject(COMMAND_BUS_TOKEN)
    private readonly commandBus: ICommandBus,
    @Inject(QUERY_BUS_TOKEN)
    private readonly queryBus: IQueryBus,
  ) {}

  /**
   * Create new tag
   *
   * Story 4.3: Create, Edit, Delete Tags - Create
   * POST /api/v1/tags
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create tag',
    description:
      'Creates a new tag and emits TagCreatedEvent. Slug is auto-generated from name.',
  })
  @ApiResponse({
    status: 201,
    description: 'Tag created successfully',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        message: 'Tag created successfully',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Tag with this name already exists' })
  @ApiBody({ type: CreateTagDto })
  async createTag(
    @Body() dto: CreateTagDto,
    @Req() req: any,
  ): Promise<{ id: string; message: string }> {
    // Extract tenant and user from request (will be set by auth middleware)
    const tenantId = req.user?.tenantId || 'mock-tenant-id';
    const createdBy = req.user?.id || 'mock-admin-id';

    const command = new CreateTagCommand(
      tenantId,
      dto.name,
      dto.category,
      dto.description,
      dto.color,
      dto.synonyms,
      dto.metadata,
      createdBy,
    );

    const tagId = await this.commandBus.execute<CreateTagCommand>(command);

    return {
      id: tagId,
      message: 'Tag created successfully',
    };
  }

  /**
   * Get tag by ID
   *
   * Story 4.3: Create, Edit, Delete Tags - Read Single
   * GET /api/v1/tags/:id
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get tag by ID',
    description:
      'Retrieves a single tag by its ID. Uses caching for performance.',
  })
  @ApiParam({ name: 'id', description: 'Tag ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Tag found',
    type: TagResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  async getTag(@Param('id') id: string, @Req() req: any) {
    // Extract tenant from request (will be set by auth middleware)
    const tenantId = req.user?.tenantId || 'mock-tenant-id';

    const query = new GetTagQuery(id, tenantId);

    return this.queryBus.execute<GetTagQuery>(query);
  }

  /**
   * List tags with filters
   *
   * Story 4.3: Create, Edit, Delete Tags - Read List
   * GET /api/v1/tags
   */
  @Get()
  @ApiOperation({
    summary: 'List tags',
    description:
      'Retrieves a list of tags with optional filters and pagination.',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filter by active status',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 50)',
  })
  @ApiResponse({
    status: 200,
    description: 'Tags list retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Emergency',
            slug: 'emergency',
            isActive: true,
          },
        ],
        total: 10,
      },
    },
  })
  async listTags(
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Req() req?: any,
  ): Promise<{ data: TagResponseDto[]; total: number }> {
    // Extract tenant from request (will be set by auth middleware)
    const tenantId = req?.user?.tenantId || 'mock-tenant-id';

    // Parse query parameters
    const isActiveBool =
      isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;

    const query = new ListTagsQuery(tenantId, isActiveBool, pageNum, limitNum);

    return this.queryBus.execute(query);
  }

  /**
   * Update tag
   *
   * Story 4.3: Create, Edit, Delete Tags - Update
   * PATCH /api/v1/tags/:id
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Update tag',
    description: 'Updates an existing tag and emits TagUpdatedEvent.',
  })
  @ApiParam({ name: 'id', description: 'Tag ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Tag updated successfully',
    schema: {
      example: { message: 'Tag updated successfully' },
    },
  })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  @ApiBody({ type: UpdateTagDto })
  async updateTag(
    @Param('id') id: string,
    @Body() dto: UpdateTagDto,
    @Req() req: any,
  ): Promise<{ message: string }> {
    // Extract tenant and user from request (will be set by auth middleware)
    const tenantId = req.user?.tenantId || 'mock-tenant-id';
    const updatedBy = req.user?.id || 'mock-admin-id';

    const command = new UpdateTagCommand(
      id,
      tenantId,
      dto.name,
      dto.description,
      dto.color,
      dto.category,
      dto.synonyms,
      dto.isActive,
      dto.metadata,
      updatedBy,
    );

    await this.commandBus.execute(command);

    return { message: 'Tag updated successfully' };
  }

  /**
   * Delete tag
   *
   * Story 4.3: Create, Edit, Delete Tags - Delete
   * DELETE /api/v1/tags/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete tag',
    description: 'Soft deletes a tag and emits TagDeletedEvent.',
  })
  @ApiParam({ name: 'id', description: 'Tag ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Tag deleted successfully',
    schema: {
      example: { message: 'Tag deleted successfully' },
    },
  })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  async deleteTag(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<{ message: string }> {
    // Extract tenant and user from request (will be set by auth middleware)
    const tenantId = req.user?.tenantId || 'mock-tenant-id';
    const deletedBy = req.user?.id || 'mock-admin-id';

    const command = new DeleteTagCommand(id, tenantId, deletedBy);

    await this.commandBus.execute(command);

    return { message: 'Tag deleted successfully' };
  }
}
