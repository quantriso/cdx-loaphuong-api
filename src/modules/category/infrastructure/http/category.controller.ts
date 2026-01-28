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
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryResponseDto,
  ListCategoriesResponseDto,
} from '../../application/dtos';
import {
  CreateCategoryCommand,
  UpdateCategoryCommand,
  DeleteCategoryCommand,
} from '../../application/commands';
import {
  GetCategoryQuery,
  ListCategoriesQuery,
  GetActiveCategoriesQuery,
} from '../../application/queries';

/**
 * Category Controller
 *
 * Story 4.1: Manage Categories
 *
 * HTTP endpoints for category management following CQRS pattern.
 * - Write operations (POST, PATCH, DELETE) → Command Bus
 * - Read operations (GET) → Query Bus
 */
@ApiTags('categories')
@Controller('api/v1/categories')
export class CategoryController {
  constructor(
    @Inject(COMMAND_BUS_TOKEN)
    private readonly commandBus: ICommandBus,
    @Inject(QUERY_BUS_TOKEN)
    private readonly queryBus: IQueryBus,
  ) {}

  /**
   * Create new category
   *
   * Story 4.1: Manage Categories - Create
   * POST /api/v1/categories
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create category',
    description:
      'Creates a new category and emits CategoryCreatedEvent. Admin only.',
  })
  @ApiResponse({
    status: 201,
    description: 'Category created successfully',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        message: 'Category created successfully',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Category value already exists' })
  @ApiBody({ type: CreateCategoryDto })
  async createCategory(
    @Body() dto: CreateCategoryDto,
    @Req() req: any,
  ): Promise<{ id: string; message: string }> {
    // Extract tenant and user from request (will be set by auth middleware)
    const tenantId = req.user?.tenantId || 'mock-tenant-id';
    const createdBy = req.user?.id || 'mock-admin-id';

    const command = new CreateCategoryCommand(
      tenantId,
      dto.value,
      dto.label,
      dto.description,
      dto.color,
      dto.icon,
      dto.sortOrder,
      dto.parentId ?? null,
      createdBy,
    );

    const categoryId =
      await this.commandBus.execute<CreateCategoryCommand>(command);

    return {
      id: categoryId,
      message: 'Category created successfully',
    };
  }

  /**
   * Get category by ID
   *
   * Story 4.1: Manage Categories - Read Single
   * GET /api/v1/categories/:id
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get category by ID',
    description:
      'Retrieves a single category by its ID. Uses caching for performance.',
  })
  @ApiParam({ name: 'id', description: 'Category ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Category found',
    type: CategoryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async getCategory(@Param('id') id: string, @Req() req: any) {
    // Extract tenant from request (will be set by auth middleware)
    const tenantId = req.user?.tenantId || 'mock-tenant-id';

    const query = new GetCategoryQuery(id, tenantId);

    return this.queryBus.execute<GetCategoryQuery>(query);
  }

  /**
   * List categories with filters
   *
   * Story 4.1: Manage Categories - Read List
   * GET /api/v1/categories
   */
  @Get()
  @ApiOperation({
    summary: 'List categories',
    description:
      'Retrieves a list of categories with optional filters and pagination.',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filter by active status',
  })
  @ApiQuery({
    name: 'parentId',
    required: false,
    type: String,
    description: 'Filter by parent category ID (null for root categories)',
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
    description: 'Categories list retrieved successfully',
    type: ListCategoriesResponseDto,
  })
  async listCategories(
    @Query('isActive') isActive?: string,
    @Query('parentId') parentId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Req() req?: any,
  ): Promise<ListCategoriesResponseDto> {
    // Extract tenant from request (will be set by auth middleware)
    const tenantId = req?.user?.tenantId || 'mock-tenant-id';

    // Parse query parameters
    const isActiveBool =
      isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    const parentIdParsed =
      parentId === 'null' ? null : parentId ? parentId : undefined;
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;

    const query = new ListCategoriesQuery(
      tenantId,
      isActiveBool,
      parentIdParsed,
      pageNum,
      limitNum,
    );

    return this.queryBus.execute<ListCategoriesResponseDto>(query);
  }

  /**
   * Get active categories
   *
   * Story 4.1: Manage Categories - Get Active for Dropdowns
   * GET /api/v1/categories/active
   */
  @Get('active/list')
  @ApiOperation({
    summary: 'Get active categories',
    description:
      'Retrieves all active categories for use in dropdowns and selection lists.',
  })
  @ApiResponse({
    status: 200,
    description: 'Active categories retrieved successfully',
    type: [CategoryResponseDto],
  })
  async getActiveCategories(@Req() req: any): Promise<CategoryResponseDto[]> {
    // Extract tenant from request (will be set by auth middleware)
    const tenantId = req.user?.tenantId || 'mock-tenant-id';

    const query = new GetActiveCategoriesQuery(tenantId);

    return this.queryBus.execute<CategoryResponseDto[]>(query);
  }

  /**
   * Update category
   *
   * Story 4.1: Manage Categories - Update
   * PATCH /api/v1/categories/:id
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Update category',
    description:
      'Updates category fields and emits CategoryUpdatedEvent. Admin only.',
  })
  @ApiParam({ name: 'id', description: 'Category ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Category updated successfully',
    schema: {
      example: {
        message: 'Category updated successfully',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({ status: 409, description: 'Category value already exists' })
  @ApiBody({ type: UpdateCategoryDto })
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
    @Req() req: any,
  ): Promise<{ message: string }> {
    // Extract tenant and user from request (will be set by auth middleware)
    const tenantId = req.user?.tenantId || 'mock-tenant-id';
    const updatedBy = req.user?.id || 'mock-admin-id';

    const command = new UpdateCategoryCommand(
      id,
      tenantId,
      dto.label,
      dto.description,
      dto.color,
      dto.icon,
      dto.isActive,
      dto.sortOrder,
      dto.parentId,
      updatedBy,
    );

    await this.commandBus.execute(command);

    return {
      message: 'Category updated successfully',
    };
  }

  /**
   * Delete category
   *
   * Story 4.1: Manage Categories - Delete
   * DELETE /api/v1/categories/:id
   *
   * Business Rules:
   * - Cannot delete category with children
   * - Soft delete (marks as deleted)
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete category',
    description:
      'Soft deletes a category and emits CategoryDeletedEvent. Cannot delete categories with children. Admin only.',
  })
  @ApiParam({ name: 'id', description: 'Category ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Category deleted successfully',
    schema: {
      example: {
        message: 'Category deleted successfully',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete category with children',
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async deleteCategory(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<{ message: string }> {
    // Extract tenant and user from request (will be set by auth middleware)
    const tenantId = req.user?.tenantId || 'mock-tenant-id';
    const deletedBy = req.user?.id || 'mock-admin-id';

    const command = new DeleteCategoryCommand(id, tenantId, deletedBy);

    await this.commandBus.execute(command);

    return {
      message: 'Category deleted successfully',
    };
  }
}
