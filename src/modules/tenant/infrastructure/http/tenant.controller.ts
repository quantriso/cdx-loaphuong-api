import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Request,
  HttpException,
  Inject,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import {
  type ICommandBus,
  type IQueryBus,
  COMMAND_BUS_TOKEN,
  QUERY_BUS_TOKEN,
} from "@core";

// TODO: Epic 2 - Add authentication and authorization
// - Import and use PermissionsGuard, RequirePermissions, Permission
// - Add @UseGuards(PermissionsGuard) and @RequirePermissions(Permission.MANAGE_TENANTS)
// - Validate JWT tokens and user roles
import type { CreateTenantDto } from "../../application/dtos/create-tenant.dto";
import type { ListTenantsQueryDto } from "../../application/dtos/list-tenants-query.dto";
import type { UpdateTenantDto } from "../../application/dtos/update-tenant.dto";
import type { ResetAdminPasswordDto } from "../../application/dtos/reset-admin-password.dto";
import type { SoftDeleteTenantDto } from "../../application/dtos/soft-delete-tenant.dto";
import { CreateTenantCommand } from "../../application/commands/create-tenant.command";
import { UpdateTenantCommand } from "../../application/commands/update-tenant.command";
import { ResetAdminPasswordCommand } from "../../application/commands/reset-admin-password.command";
import { SoftDeleteTenantCommand } from "../../application/commands/soft-delete-tenant.command";
import { GetTenantQuery } from "../../application/queries/get-tenant.query";
import { ListTenantsQuery } from "../../application/queries/list-tenants.query";
import { TENANT_READ_DAO_TOKEN } from "../../constants/tokens";
import type { ITenantReadDao } from "../../application/queries/ports/tenant-read-dao.interface";

@ApiTags("tenants")
@Controller("tenants")
export class TenantController {
  constructor(
    @Inject(COMMAND_BUS_TOKEN) private readonly commandBus: ICommandBus,
    @Inject(QUERY_BUS_TOKEN) private readonly queryBus: IQueryBus,
    @Inject(TENANT_READ_DAO_TOKEN)
    private readonly tenantReadDao: ITenantReadDao,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new tenant" })
  @ApiResponse({
    status: 201,
    description: "Tenant created successfully",
    schema: {
      example: {
        id: "clxxxxx",
        tenantId: "sample-tenant",
        name: "Sample Tenant",
        status: "ACTIVE",
        adminCredentials: {
          email: "admin@sample-tenant.loaphuong.vn",
          temporaryPassword: "Abc123!@#XyZ",
        },
        categoriesInitialized: 9,
        createdAt: "2026-01-09T10:00:00.000Z",
        updatedAt: "2026-01-09T10:00:00.000Z",
      },
    },
  })
  @ApiResponse({ status: 400, description: "Bad Request - Invalid input" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Requires SUPER_ADMIN role",
  })
  @ApiResponse({ status: 409, description: "Conflict - Tenant already exists" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiBearerAuth()
  async createTenant(
    @Body() createTenantDto: CreateTenantDto,
    @Request() req: any
  ) {
    // TODO: Get userId from JWT token when auth is implemented
    // TODO: Check if user has SUPER_ADMIN role
    const userId = req.user?.id || "system";

    // Generate subdomain from name (slugify)
    const subdomain = this.generateSubdomain(createTenantDto.name);

    const command = new CreateTenantCommand(
      createTenantDto.name,
      subdomain,
      `admin@${subdomain}.loaphuong.vn`,
      "temp_password", // TODO: Generate secure password
      createTenantDto.brandingConfig,
      createTenantDto.limits,
      userId
    );

    const tenantId = await this.commandBus.execute<CreateTenantCommand, string>(
      command
    );

    // Get created tenant details
    const tenant = await this.queryBus.execute(new GetTenantQuery(tenantId));

    return tenant;
  }

  private generateSubdomain(name: string): string {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  @Get()
  @ApiOperation({
    summary: "List all tenants with pagination and filtering",
    description:
      "Returns paginated list of tenants with optional status filter and sorting",
  })
  @ApiResponse({
    status: 200,
    description: "List of tenants retrieved successfully",
    schema: {
      example: {
        success: true,
        data: {
          items: [
            {
              id: "clxxxxx",
              tenantId: "sample-tenant",
              name: "Sample Tenant",
              status: "ACTIVE",
              brandingConfig: {
                logo: "https://example.com/logo.png",
                primaryColor: "#0066cc",
              },
              limits: {
                maxUsers: 100,
                maxContent: 1000,
              },
              statistics: {
                userCount: 45,
                contentCount: 120,
                storageUsage: 5242880,
              },
              createdAt: "2026-01-09T10:00:00.000Z",
              updatedAt: "2026-01-09T12:00:00.000Z",
            },
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 45,
            totalPages: 3,
          },
        },
        message: "Tenants retrieved successfully",
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Bad Request - Invalid query parameters",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Requires SUPER_ADMIN role",
  })
  @ApiBearerAuth()
  async listTenants(@Request() req: any) {
    // Extract query parameters
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const status = req.query.status as string | undefined;
    const sortBy = (req.query.sortBy || "createdAt") as
      | "createdAt"
      | "updatedAt"
      | "name"
      | "status";
    const sortOrder = (req.query.sortOrder || "DESC") as "ASC" | "DESC";

    // TODO: Add SUPER_ADMIN role check when auth is implemented
    // if (req.user?.role !== 'SUPER_ADMIN') {
    //   throw new ForbiddenException('Only SUPER_ADMIN can list all tenants');
    // }

    const query = new ListTenantsQuery(page, limit, status, sortBy, sortOrder);
    return this.queryBus.execute(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get tenant by ID" })
  @ApiResponse({
    status: 200,
    description: "Tenant details",
    schema: {
      example: {
        id: "clxxxxx",
        tenantId: "sample-tenant",
        name: "Sample Tenant",
        status: "ACTIVE",
        brandingConfig: {
          logo: "https://example.com/logo.png",
          primaryColor: "#0066cc",
        },
        limits: {
          maxUsers: 100,
          maxContent: 1000,
        },
        createdAt: "2026-01-09T10:00:00.000Z",
        updatedAt: "2026-01-09T10:00:00.000Z",
      },
    },
  })
  @ApiResponse({ status: 404, description: "Tenant not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiBearerAuth()
  async getTenantById(@Param("id") id: string) {
    const query = new GetTenantQuery(id);
    return this.queryBus.execute(query);
  }

  @Patch(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Update tenant configuration",
    description:
      "Partially update tenant configuration (name, status, branding, limits)",
  })
  @ApiResponse({
    status: 200,
    description: "Tenant configuration updated successfully",
    schema: {
      example: {
        id: "clh123abc456",
        tenantId: "x-tan-binh",
        name: "Xã Tân Bình (Updated)",
        status: "ACTIVE",
        brandingConfig: {
          logo: "https://new-logo-url",
          primaryColor: "#FF5733",
          secondaryColor: "#C70039",
        },
        limits: {
          maxUsers: 150,
          maxContent: 2000,
          maxStorage: 107374182400,
        },
        createdAt: "2026-01-09T10:00:00.000Z",
        updatedAt: "2026-01-09T13:00:00.000Z",
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Bad Request - Invalid configuration values",
  })
  @ApiResponse({ status: 404, description: "Tenant not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Requires SUPER_ADMIN role",
  })
  @ApiBearerAuth()
  async updateTenant(
    @Param("id") id: string,
    @Body() updateTenantDto: UpdateTenantDto,
    @Request() req: any
  ) {
    // Get userId from JWT token (would be set by auth middleware)
    const userId = req.user?.id || "system";

    // TODO: Add SUPER_ADMIN role check when auth is implemented
    // if (req.user?.role !== 'SUPER_ADMIN') {
    //   throw new ForbiddenException('Only SUPER_ADMIN can update tenants');
    // }

    const command = new UpdateTenantCommand(
      id,
      updateTenantDto.name,
      updateTenantDto.status,
      updateTenantDto.brandingConfig,
      updateTenantDto.limits,
      updateTenantDto.reason,
      userId
    );

    await this.commandBus.execute(command);

    // Get updated tenant
    const tenant = await this.queryBus.execute(new GetTenantQuery(id));
    return tenant;
  }

  @Post(":id/reset-admin-password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Reset tenant admin password",
    description:
      "Generate a new temporary password for tenant admin and send via email",
  })
  @ApiResponse({
    status: 200,
    description: "Admin password reset successfully",
    schema: {
      example: {
        tenantId: "x-tan-binh",
        adminEmail: "admin@x-tan-binh.loaphuong.vn",
        passwordReset: true,
        emailSent: true,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Bad Request - Invalid reason provided",
  })
  @ApiResponse({ status: 404, description: "Tenant not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Requires SUPER_ADMIN role",
  })
  @ApiBearerAuth()
  async resetAdminPassword(
    @Param("id") id: string,
    @Body() resetAdminPasswordDto: ResetAdminPasswordDto,
    @Request() req: any
  ) {
    // Get userId from JWT token (would be set by auth middleware)
    const userId = req.user?.id || "system";

    // TODO: Add SUPER_ADMIN role check when auth is implemented
    // if (req.user?.role !== 'SUPER_ADMIN') {
    //   throw new ForbiddenException('Only SUPER_ADMIN can reset admin passwords');
    // }

    const command = new ResetAdminPasswordCommand(
      id,
      resetAdminPasswordDto.reason,
      userId
    );

    const result = await this.commandBus.execute(command);

    return result;
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Soft delete tenant",
    description:
      "Mark tenant as deleted while preserving data for audit and compliance",
  })
  @ApiResponse({
    status: 200,
    description: "Tenant soft deleted successfully",
    schema: {
      example: {
        id: "clh123abc456",
        tenantId: "x-tan-binh",
        name: "Xã Tân Bình",
        status: "DELETED",
        deletedAt: "2026-01-09T14:00:00.000Z",
        deletedBy: "clh-super-admin-id",
        reason: "Tenant requested closure due to migration to another platform",
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Bad Request - Invalid reason or tenant has active users",
  })
  @ApiResponse({ status: 404, description: "Tenant not found" })
  @ApiResponse({
    status: 409,
    description: "Conflict - Tenant already deleted",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Requires SUPER_ADMIN role",
  })
  @ApiBearerAuth()
  async softDeleteTenant(
    @Param("id") id: string,
    @Body() softDeleteTenantDto: SoftDeleteTenantDto,
    @Request() req: any
  ) {
    // Get userId from JWT token (would be set by auth middleware)
    const userId = req.user?.id || "system";

    // TODO: Add SUPER_ADMIN role check when auth is implemented
    // if (req.user?.role !== 'SUPER_ADMIN') {
    //   throw new ForbiddenException('Only SUPER_ADMIN can delete tenants');
    // }

    const command = new SoftDeleteTenantCommand(
      id,
      softDeleteTenantDto.reason,
      softDeleteTenantDto.forceDelete,
      userId
    );

    await this.commandBus.execute(command);

    return {
      success: true,
      message: "Tenant deleted successfully",
    };
  }
}
