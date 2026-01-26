import {
  Inject,
  NotFoundException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { SoftDeleteTenantCommand } from '../soft-delete-tenant.command';
import { ICommandHandler } from '@core/application';
import { REQUEST_CONTEXT_TOKEN } from '@core/constants';
import type { IRequestContextProvider } from '@core/common';
import { CommandHandler } from '@shared/cqrs';
import type { ITenantRepository } from '../../../domain/repositories';
import { TENANT_REPOSITORY_TOKEN } from '../../../constants/tokens';

/**
 * Soft Delete Tenant Command Handler
 *
 * Responsibilities:
 * 1. Load tenant aggregate
 * 2. Validate deletion eligibility
 * 3. Perform soft delete
 * 4. Persist changes (events auto-published)
 *
 * Request Context Integration:
 * - Passes metadata to domain methods for distributed tracing
 */
@CommandHandler(SoftDeleteTenantCommand)
export class SoftDeleteTenantHandler implements ICommandHandler<
  SoftDeleteTenantCommand,
  void
> {
  constructor(
    @Inject(TENANT_REPOSITORY_TOKEN)
    private readonly tenantRepository: ITenantRepository,
    @Optional()
    @Inject(REQUEST_CONTEXT_TOKEN)
    private readonly requestContext?: IRequestContextProvider,
  ) {}

  async execute(command: SoftDeleteTenantCommand): Promise<void> {
    // 0. Get request context for distributed tracing
    const context = this.requestContext?.current();
    const eventMetadata = context
      ? {
          correlationId: context.correlationId,
          causationId: context.causationId,
          userId: context.userId,
        }
      : undefined;

    // 1. Load tenant aggregate
    const tenant = await this.tenantRepository.getById(command.id);

    if (!tenant) {
      throw new NotFoundException(`Tenant with id ${command.id} not found`);
    }

    // 2. Check if tenant is already deleted
    if (tenant.isDeleted) {
      throw new ForbiddenException('Tenant is already deleted');
    }

    // TODO: Epic 2 - Check if tenant has active users before deletion
    // if (!command.forceDelete) {
    //   const activeUsers = await userRepository.countActiveUsersByTenant(tenant.subdomain);
    //   if (activeUsers > 0) {
    //     throw new ForbiddenException(`Cannot delete tenant with ${activeUsers} active users`);
    //   }
    // }

    // 3. Soft delete tenant with metadata
    tenant.softDelete(eventMetadata);

    // 4. Persist (Domain Events auto-published by Repository)
    await this.tenantRepository.save(tenant);

    // TODO: Epic 6 - Add audit logging with correlationId
    // TODO: Epic 7 - Invalidate cache
  }
}
