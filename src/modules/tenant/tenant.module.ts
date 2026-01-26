import { Module } from '@nestjs/common';
import { SharedCqrsModule } from '@shared';
import { TenantController } from './infrastructure/http';
import { TenantRepository } from './infrastructure/persistence/write';
import { TenantReadDao } from './infrastructure/persistence/read';
import { TenantUniquenessChecker } from './infrastructure/persistence/tenant-uniqueness-checker';
import { EventHandlers } from './infrastructure';
import {
  TENANT_REPOSITORY_TOKEN,
  TENANT_READ_DAO_TOKEN,
  TENANT_UNIQUENESS_CHECKER_TOKEN,
} from './constants/tokens';
import { CommandHandlers } from './application/commands/handlers';
import { QueryHandlers } from './application/queries/handlers';

/**
 * Tenant Module
 *
 * Feature module implementing DDD/CQRS pattern.
 *
 * Architecture:
 * - Domain: Entities, Value Objects, Domain Events, Repositories (interfaces)
 * - Application: Commands, Queries, Handlers, DTOs, Ports
 * - Infrastructure: Repository Implementations, Read DAO, Controller, Projections
 *
 * Dependency Injection:
 * - Interfaces (Ports) are bound to Implementations (Adapters)
 * - SharedCqrsModule provides CommandBus, QueryBus, EventBus globally
 */
@Module({
  imports: [SharedCqrsModule],
  controllers: [TenantController],
  providers: [
    // =================================================================
    // Write Side (Command)
    // =================================================================

    // Repository Implementation (Adapter)
    TenantRepository,
    {
      provide: TENANT_REPOSITORY_TOKEN,
      useExisting: TenantRepository,
    },

    // Domain Services
    TenantUniquenessChecker,
    {
      provide: TENANT_UNIQUENESS_CHECKER_TOKEN,
      useExisting: TenantUniquenessChecker,
    },

    // Command Handlers
    ...CommandHandlers,

    // =================================================================
    // Read Side (Query)
    // =================================================================

    // Read DAO Implementation (Adapter)
    TenantReadDao,
    {
      provide: TENANT_READ_DAO_TOKEN,
      useExisting: TenantReadDao,
    },

    // Query Handlers
    ...QueryHandlers,

    // =================================================================
    // Event Handlers (Projections)
    // =================================================================

    // Event Handlers
    ...EventHandlers,
  ],
  exports: [TENANT_REPOSITORY_TOKEN, TENANT_READ_DAO_TOKEN],
})
export class TenantModule {}
