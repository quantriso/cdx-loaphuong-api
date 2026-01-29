import { Module } from '@nestjs/common';
import { SharedCqrsModule, SharedModule } from 'src/libs/shared';

// Application - Handlers
import { CommandHandlers } from './application/commands/handlers';
import { QueryHandlers } from './application/queries/handlers';

// Infrastructure - Repository & DAO
import { TagRepository } from './infrastructure/persistence/write/tag.repository';
import { TagReadDao } from './infrastructure/persistence/read';
import { TagController } from './infrastructure/http/tag.controller';

// Constants
import { TAG_REPOSITORY_TOKEN, TAG_READ_DAO_TOKEN } from './constants/tokens';

/**
 * Tag Module
 *
 * Story 4.3: Create, Edit, Delete Tags
 * Feature module implementing DDD/CQRS pattern.
 *
 * Architecture:
 * - Domain: Entities, Value Objects, Events, Repository Interfaces
 * - Application: Commands, Queries, Handlers, DTOs
 * - Infrastructure: Repository Implementation, Read DAO, HTTP Controllers
 */
@Module({
  imports: [SharedCqrsModule, SharedModule],
  controllers: [TagController],
  providers: [
    // =================================================================
    // Write Side (Command)
    // =================================================================

    // Repository Implementation (Adapter)
    TagRepository,
    {
      provide: TAG_REPOSITORY_TOKEN,
      useExisting: TagRepository,
    },

    // Command Handlers
    ...CommandHandlers,

    // =================================================================
    // Read Side (Query)
    // =================================================================

    // Read DAO Implementation (Adapter)
    TagReadDao,
    {
      provide: TAG_READ_DAO_TOKEN,
      useExisting: TagReadDao,
    },

    // Query Handlers
    ...QueryHandlers,
  ],
  exports: [TAG_REPOSITORY_TOKEN, TAG_READ_DAO_TOKEN],
})
export class TagModule {}
