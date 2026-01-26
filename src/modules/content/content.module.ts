import { Module } from '@nestjs/common';
import { SharedCqrsModule, SharedModule } from '@shared';

// Application - Handlers
import { CommandHandlers } from './application/commands/handlers';
import { QueryHandlers } from './application/queries/handlers';

// Application - Services
import { ContentCacheService } from './application/services/content-cache.service';

// Domain - Services
import { ContentValidatorService } from './domain/services/content-validator.service';
import { ContentHistoryService } from './domain/services/content-history.service';

// Infrastructure - Repository & DAO
import { ContentRepository } from './infrastructure/persistence/write';
import { ContentReadDao } from './infrastructure/persistence/read';
import { ContentController } from './infrastructure/http';
import { EventHandlers } from './infrastructure';

// Infrastructure - Adapters for Domain Services
import { ContentRulesCheckerAdapter } from './infrastructure/persistence/content-rules-checker';
import { ContentHistoryTrackerAdapter } from './infrastructure/persistence/content-history-tracker';

// Constants
import {
  CONTENT_REPOSITORY_TOKEN,
  CONTENT_READ_DAO_TOKEN,
  CONTENT_RULES_CHECKER_TOKEN,
  CONTENT_HISTORY_TRACKER_TOKEN,
} from './constants';

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
  imports: [SharedCqrsModule, SharedModule],
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
    // Application Services
    // =================================================================

    ContentCacheService,

    // =================================================================
    // Domain Services & Adapters
    // =================================================================

    // Content Rules Checker (Port + Adapter)
    ContentRulesCheckerAdapter,
    {
      provide: CONTENT_RULES_CHECKER_TOKEN,
      useExisting: ContentRulesCheckerAdapter,
    },
    ContentValidatorService,

    // Content History Tracker (Port + Adapter)
    ContentHistoryTrackerAdapter,
    {
      provide: CONTENT_HISTORY_TRACKER_TOKEN,
      useExisting: ContentHistoryTrackerAdapter,
    },
    ContentHistoryService,

    // =================================================================
    // Event Handlers (Projections)
    // =================================================================

    // Event Handlers
    ...EventHandlers,
  ],
  exports: [CONTENT_REPOSITORY_TOKEN, CONTENT_READ_DAO_TOKEN],
})
export class ContentModule {}
