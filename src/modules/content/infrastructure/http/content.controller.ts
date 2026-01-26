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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import type { ICommandBus, IQueryBus } from '@core/application';
import { COMMAND_BUS_TOKEN, QUERY_BUS_TOKEN } from '@core/constants';
import {
  CreateContentDto,
  UpdateContentDto,
  ContentResponseDto,
  ApproveContentDto,
  RejectContentDto,
} from '../../application/dtos';
import {
  CreateContentCommand,
  UpdateContentCommand,
  SubmitContentForApprovalCommand,
  ApproveContentCommand,
  RejectContentCommand,
  PublishContentCommand,
} from '../../application/commands';
import { GetContentQuery } from '../../application/queries';

/**
 * Content Controller
 *
 * Story 3.1: Create Content Draft
 * Story 3.2: Update Content
 * Story 3.3: Submit Content for Approval
 * Story 3.4: Approve Content
 * Story 3.5: Reject Content with Feedback
 *
 * HTTP endpoints for content management following CQRS pattern.
 * - Write operations (POST, PATCH) → Command Bus
 * - Read operations (GET) → Query Bus
 */
@ApiTags('contents')
@Controller('api/v1/contents')
export class ContentController {
  constructor(
    @Inject(COMMAND_BUS_TOKEN)
    private readonly commandBus: ICommandBus,
    @Inject(QUERY_BUS_TOKEN)
    private readonly queryBus: IQueryBus,
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
    summary: 'Create content draft',
    description:
      'Creates a new content in DRAFT status and emits ContentCreatedEvent',
  })
  @ApiResponse({
    status: 201,
    description: 'Content draft created successfully',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        message: 'Content draft created successfully',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiBody({ type: CreateContentDto })
  async createContent(
    @Body() dto: CreateContentDto,
    @Req() req: any,
  ): Promise<{ id: string; message: string }> {
    // Extract tenant and user from request (will be set by auth middleware)
    const tenantId = req.user?.tenantId || 'mock-tenant-id';
    const authorId = req.user?.id || 'mock-user-id';

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
      dto.featuredImage,
    );

    const contentId =
      await this.commandBus.execute<CreateContentCommand>(command);

    return {
      id: contentId,
      message: 'Content draft created successfully',
    };
  }

  /**
   * Get content by ID
   *
   * Story 3.1: Create Content Draft - Read Side
   * GET /api/v1/contents/:id
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get content by ID',
    description:
      'Retrieves a single content by its ID. Uses caching for performance.',
  })
  @ApiParam({ name: 'id', description: 'Content ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Content found',
    type: ContentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Content not found' })
  async getContent(@Param('id') id: string, @Req() req: any) {
    // Extract tenant from request (will be set by auth middleware)
    const tenantId = req.user?.tenantId || 'mock-tenant-id';

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
  @Patch(':id')
  @ApiOperation({
    summary: 'Update content',
    description:
      'Updates content fields and emits ContentUpdatedEvent. Only DRAFT and REJECTED content can be updated.',
  })
  @ApiParam({ name: 'id', description: 'Content ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Content updated successfully',
    schema: {
      example: {
        message: 'Content updated successfully',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot update content in current status',
  })
  @ApiResponse({ status: 404, description: 'Content not found' })
  @ApiBody({ type: UpdateContentDto })
  async updateContent(
    @Param('id') id: string,
    @Body() dto: UpdateContentDto,
    @Req() req: any,
  ): Promise<{ message: string }> {
    // Extract tenant and user from request (will be set by auth middleware)
    const tenantId = req.user?.tenantId || 'mock-tenant-id';
    const userId = req.user?.id || 'mock-user-id';

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
      dto.tags,
    );

    await this.commandBus.execute(command);

    return {
      message: 'Content updated successfully',
    };
  }

  /**
   * Submit content for approval
   *
   * Story 3.3: Submit Content for Approval
   * POST /api/v1/contents/:id/submit-for-approval
   *
   * Business Rules:
   * - Only DRAFT content can be submitted
   * - Only content author can submit
   * - Status transitions from DRAFT to PENDING
   */
  @Post(':id/submit-for-approval')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit content for approval',
    description:
      'Submits DRAFT content for approval and emits ContentSubmittedForApprovalEvent. Status transitions from DRAFT to PENDING.',
  })
  @ApiParam({ name: 'id', description: 'Content ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Content submitted for approval successfully',
    schema: {
      example: {
        message: 'Content submitted for approval successfully',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot submit content (not in DRAFT status or not author)',
  })
  @ApiResponse({ status: 404, description: 'Content not found' })
  async submitForApproval(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<{ message: string }> {
    // Extract tenant and user from request (will be set by auth middleware)
    const tenantId = req.user?.tenantId || 'mock-tenant-id';
    const userId = req.user?.id || 'mock-user-id';

    const command = new SubmitContentForApprovalCommand(id, tenantId, userId);

    await this.commandBus.execute(command);

    return {
      message: 'Content submitted for approval successfully',
    };
  }

  /**
   * Approve content
   *
   * Story 3.4: Approve Content
   * POST /api/v1/contents/:id/approve
   *
   * Business Rules:
   * - Only PENDING content can be approved
   * - Only Admin can approve
   * - Status transitions from PENDING to APPROVED
   */
  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve content',
    description:
      'Approves PENDING content and emits ContentApprovedEvent. Status transitions from PENDING to APPROVED. Admin only.',
  })
  @ApiParam({ name: 'id', description: 'Content ID (UUID)' })
  @ApiBody({ type: ApproveContentDto })
  @ApiResponse({
    status: 200,
    description: 'Content approved successfully',
    schema: {
      example: {
        message: 'Content approved successfully',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot approve content (not in PENDING status)',
  })
  @ApiResponse({ status: 404, description: 'Content not found' })
  async approveContent(
    @Param('id') id: string,
    @Body() dto: ApproveContentDto,
    @Req() req: any,
  ): Promise<{ message: string }> {
    // Extract tenant and admin user from request (will be set by auth middleware)
    const tenantId = req.user?.tenantId || 'mock-tenant-id';
    const adminId = req.user?.id || 'mock-admin-id';

    const command = new ApproveContentCommand(
      id,
      tenantId,
      adminId,
      dto.reason,
    );

    await this.commandBus.execute(command);

    return {
      message: 'Content approved successfully',
    };
  }

  /**
   * Reject content with feedback
   *
   * Story 3.5: Reject Content with Feedback
   * POST /api/v1/contents/:id/reject
   *
   * Business Rules:
   * - Only PENDING content can be rejected
   * - Only Admin can reject
   * - Rejection reason is required (feedback for author)
   * - Status transitions from PENDING to REJECTED
   */
  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reject content with feedback',
    description:
      'Rejects PENDING content with feedback and emits ContentRejectedEvent. Status transitions from PENDING to REJECTED. Admin only.',
  })
  @ApiParam({ name: 'id', description: 'Content ID (UUID)' })
  @ApiBody({ type: RejectContentDto })
  @ApiResponse({
    status: 200,
    description: 'Content rejected successfully',
    schema: {
      example: {
        message: 'Content rejected successfully',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Cannot reject content (not in PENDING status or invalid reason)',
  })
  @ApiResponse({ status: 404, description: 'Content not found' })
  async rejectContent(
    @Param('id') id: string,
    @Body() dto: RejectContentDto,
    @Req() req: any,
  ): Promise<{ message: string }> {
    // Extract tenant and admin user from request (will be set by auth middleware)
    const tenantId = req.user?.tenantId || 'mock-tenant-id';
    const adminId = req.user?.id || 'mock-admin-id';

    const command = new RejectContentCommand(
      id,
      tenantId,
      adminId,
      dto.reason,
    );

    await this.commandBus.execute(command);

    return {
      message: 'Content rejected successfully',
    };
  }

  /**
   * Publish content
   *
   * Story 3.6: Publish Content
   * POST /api/v1/contents/:id/publish
   *
   * Business Rules:
   * - Only APPROVED content can be published
   * - Only Admin can publish
   * - Status transitions from APPROVED to PUBLISHED
   */
  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Publish content',
    description:
      'Publishes APPROVED content and emits ContentPublishedEvent. Status transitions from APPROVED to PUBLISHED. Admin only.',
  })
  @ApiParam({ name: 'id', description: 'Content ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Content published successfully',
    schema: {
      example: {
        message: 'Content published successfully',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot publish content (not in APPROVED status)',
  })
  @ApiResponse({ status: 404, description: 'Content not found' })
  async publishContent(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<{ message: string }> {
    // Extract tenant and admin user from request (will be set by auth middleware)
    const tenantId = req.user?.tenantId || 'mock-tenant-id';
    const adminId = req.user?.id || 'mock-admin-id';

    const command = new PublishContentCommand(id, tenantId, adminId);

    await this.commandBus.execute(command);

    return {
      message: 'Content published successfully',
    };
  }
}
