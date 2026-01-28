import { Module } from '@nestjs/common';
import { SharedCqrsModule, SharedModule } from '@shared';

// Application - Handlers
import { CommandHandlers } from './application/commands/handlers';
import { QueryHandlers } from './application/queries/handlers';

// Infrastructure - Repository & DAO
import { CategoryRepository } from './infrastructure/persistence/write';
import { CategoryReadDao } from './infrastructure/persistence/read';
import { CategoryController } from './infrastructure/http';
import { EventHandlers } from './infrastructure';

// Constants
import {
  CATEGORY_REPOSITORY_TOKEN,
  CATEGORY_READ_DAO_TOKEN,
} from './constants';

/**
 * Category Module
 *
 * Story 4.1: Manage Categories
 * Feature module implementing DDD/CQRS pattern.
 *
 * Architecture:
 * - Domain: Entities, Value Objects, Events, Repository Interfaces
 * - Application: Commands, Queries, Handlers, DTOs
 * - Infrastructure: Repository Implementation, Read DAO, HTTP Controllers
 */
@Module({
  imports: [SharedCqrsModule, SharedModule],
  controllers: [CategoryController],
  providers: [
    // =================================================================
    // Write Side (Command)
    // =================================================================

    // Repository Implementation (Adapter)
    CategoryRepository,
    {
      provide: CATEGORY_REPOSITORY_TOKEN,
      useExisting: CategoryRepository,
    },

    // Command Handlers
    ...CommandHandlers,

    // =================================================================
    // Read Side (Query)
    // =================================================================

    // Read DAO Implementation (Adapter)
    CategoryReadDao,
    {
      provide: CATEGORY_READ_DAO_TOKEN,
      useExisting: CategoryReadDao,
    },

    // Query Handlers
    ...QueryHandlers,

    // =================================================================
    // Event Handlers (Projections)
    // =================================================================

    // Event Handlers
    ...EventHandlers,
  ],
  exports: [CATEGORY_REPOSITORY_TOKEN, CATEGORY_READ_DAO_TOKEN],
})
export class CategoryModule {}
