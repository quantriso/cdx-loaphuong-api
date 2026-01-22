import { Inject, NotFoundException, Optional } from '@nestjs/common';
import { UpdateTenantCommand } from '../update-tenant.command';
import { ICommandHandler } from '@core/application';
import { REQUEST_CONTEXT_TOKEN } from '@core/constants';
import type { IRequestContextProvider } from '@core/common';
import { CommandHandler } from '@shared/cqrs';
import type { ITenantRepository } from '../../../domain/repositories';
import { TENANT_REPOSITORY_TOKEN } from '../../../constants/tokens';

/**
 * Update Tenant Command Handler
 *
 * Responsibilities:
 * 1. Load existing tenant aggregate
 * 2. Update tenant configuration
 * 3. Persist changes (events auto-published)
 *
 * Request Context Integration:
 * - Passes metadata to domain methods for distributed tracing
 */
@CommandHandler(UpdateTenantCommand)
export class UpdateTenantHandler
  implements ICommandHandler<UpdateTenantCommand, void>
{
  constructor(
    @Inject(TENANT_REPOSITORY_TOKEN)
    private readonly tenantRepository: ITenantRepository,
    @Optional()
    @Inject(REQUEST_CONTEXT_TOKEN)
    private readonly requestContext?: IRequestContextProvider,
  ) {}

  async execute(command: UpdateTenantCommand): Promise<void> {
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

    // 2. Update tenant configuration with metadata
    tenant.updateConfig(
      {
        name: command.name,
        brandingConfig: command.brandingConfig,
        limits: command.limits,
      },
      eventMetadata,
    );

    // 3. Persist (Domain Events auto-published by Repository)
    await this.tenantRepository.save(tenant);
  }
}
