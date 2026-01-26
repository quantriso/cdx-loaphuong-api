import { randomUUID } from 'crypto';
import { Inject, Optional } from '@nestjs/common';
import { CreateTenantCommand } from '../create-tenant.command';
import { ICommandHandler } from '@core/application';
import { REQUEST_CONTEXT_TOKEN } from '@core/constants';
import type { IRequestContextProvider } from '@core/common';
import { CommandHandler } from '@shared/cqrs';
import type { ITenantRepository } from '../../../domain/repositories';
import { Tenant } from '../../../domain/entities';
import { TenantId } from '../../../domain/value-objects';
import {
  TENANT_REPOSITORY_TOKEN,
  TENANT_UNIQUENESS_CHECKER_TOKEN,
} from '../../../constants/tokens';
import { hashPassword } from '@shared/security';
import {
  TenantUniquenessService,
  type ITenantUniquenessChecker,
} from '../../../domain/services';

/**
 * Create Tenant Command Handler
 *
 * Responsibilities:
 * 1. Validate subdomain uniqueness
 * 2. Hash admin password
 * 3. Create Domain Entity via Factory Method
 * 4. Persist via Repository (events auto-published)
 *
 * Note: Business logic (validation, rules) is delegated to Domain Layer.
 * Handler only orchestrates the flow.
 *
 * Request Context Integration:
 * - Injects IRequestContextProvider to access correlation ID, user ID
 * - Domain events include metadata for distributed tracing
 */
@CommandHandler(CreateTenantCommand)
export class CreateTenantHandler implements ICommandHandler<
  CreateTenantCommand,
  string
> {
  private readonly uniquenessService: TenantUniquenessService;

  constructor(
    @Inject(TENANT_REPOSITORY_TOKEN)
    private readonly tenantRepository: ITenantRepository,
    @Inject(TENANT_UNIQUENESS_CHECKER_TOKEN)
    uniquenessChecker: ITenantUniquenessChecker,
    @Optional()
    @Inject(REQUEST_CONTEXT_TOKEN)
    private readonly requestContext?: IRequestContextProvider,
  ) {
    // Domain Service instantiated with injected port
    this.uniquenessService = new TenantUniquenessService(uniquenessChecker);
  }

  async execute(command: CreateTenantCommand): Promise<string> {
    // 0. Get request context for distributed tracing
    const context = this.requestContext?.current();
    const eventMetadata = context
      ? {
          correlationId: context.correlationId,
          causationId: context.causationId,
          userId: context.userId,
        }
      : undefined;

    // 1. Validate uniqueness via Domain Service
    await this.uniquenessService.validateUniqueness({
      subdomain: command.subdomain,
      adminEmail: command.adminEmail,
    });

    // 2. Hash admin password
    const adminPasswordHash = await hashPassword(command.adminPassword, 12);

    // 3. Create Value Objects
    const tenantId = new TenantId(randomUUID());

    // 4. Create Aggregate via Factory Method with event metadata
    // All business validation happens inside Tenant.create()
    const tenant = Tenant.create(
      {
        id: tenantId,
        name: command.name,
        subdomain: command.subdomain,
        adminEmail: command.adminEmail,
        adminPasswordHash,
        brandingConfig: command.brandingConfig || null,
        limits: command.limits || null,
        createdBy: command.createdBy || 'system',
      },
      eventMetadata,
    );

    // 5. Persist (Domain Events auto-published by Repository)
    await this.tenantRepository.save(tenant);

    return tenant.id;
  }
}
