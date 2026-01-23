import { Module } from "@nestjs/common";
import { SharedCqrsModule } from "@shared";

// Application - Handlers
import { CommandHandlers } from "./application/commands/handlers";
import { QueryHandlers } from "./application/queries/handlers";

// Infrastructure - Repository & DAO
import { ContentRepository } from "./infrastructure/persistence/write";
import { ContentReadDao } from "./infrastructure/persistence/read";
import { ContentController } from "./infrastructure/http";
import { EventHandlers } from "./infrastructure";

// Constants
import { CONTENT_REPOSITORY_TOKEN, CONTENT_READ_DAO_TOKEN } from "./constants";

/**
 * Content Module
 *
 * Story 3.1: Create Content Draft
 * Feature module implementing DDD/CQRS pattern.
 *
 * Architecture:
 * - Domain: Entities, Value Objects, Events, Repository Interfaces
 * - Application: Commands, Queries, Handlers, DTOs
 * - Infrastructure: Repository Implementation, Read DAO, HTTP Controllers
 */
@Module({
  imports: [SharedCqrsModule],
  controllers: [ContentController],
  providers: [
    // =================================================================
    // Write Side (Command)
    // =================================================================

    // Repository Implementation (Adapter)
    ContentRepository,
    {
      provide: CONTENT_REPOSITORY_TOKEN,
      useExisting: ContentRepository,
    },

    // Command Handlers
    ...CommandHandlers,

    // =================================================================
    // Read Side (Query)
    // =================================================================

    // Read DAO Implementation (Adapter)
    ContentReadDao,
    {
      provide: CONTENT_READ_DAO_TOKEN,
      useExisting: ContentReadDao,
    },

    // Query Handlers
    ...QueryHandlers,

    // =================================================================
    // Event Handlers (Projections)
    // =================================================================

    // Event Handlers
    ...EventHandlers,
  ],
  exports: [CONTENT_REPOSITORY_TOKEN, CONTENT_READ_DAO_TOKEN],
})
export class ContentModule {}
