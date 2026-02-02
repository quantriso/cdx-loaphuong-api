import { Module } from '@nestjs/common';
import { SharedCqrsModule, SharedModule } from '@shared';

// Application - Handlers
import { CommandHandlers } from './application/commands/handlers';
import { QueryHandlers } from './application/queries/handlers';

// Infrastructure - Controller
import { FileController } from './infrastructure/http';

// Infrastructure - Persistence
import { FileRepository } from './infrastructure/persistence/write';
import { FileReadDao } from './infrastructure/persistence/read';

// Infrastructure - Services
import { FileRulesCheckerService } from './infrastructure/services';

// Domain - Services
import { FileValidationService } from './domain/services';

// Constants
import {
  FILE_REPOSITORY_TOKEN,
  FILE_READ_DAO_TOKEN,
  FILE_RULES_CHECKER_TOKEN,
  FILE_VALIDATION_SERVICE_TOKEN,
} from './constants';

/**
 * File Module
 *
 * Epic 5: File Management
 *
 * Stories:
 * - 5.1: Upload File
 * - 5.2: Validate File Upload
 * - 5.3: Process Uploaded Images
 * - 5.4: Download File
 * - 5.5: Delete File
 *
 * Feature module implementing DDD/CQRS pattern.
 *
 * Architecture:
 * - Domain: Entities, Value Objects, Events, Repository Interfaces
 * - Application: Commands, Queries, Handlers, DTOs
 * - Infrastructure: Repository Implementation, HTTP Controllers
 */
@Module({
  imports: [SharedCqrsModule, SharedModule],
  controllers: [FileController],
  providers: [
    // =================================================================
    // Infrastructure Services
    // =================================================================

    // File Rules Checker (Domain Port Implementation)
    FileRulesCheckerService,
    {
      provide: FILE_RULES_CHECKER_TOKEN,
      useExisting: FileRulesCheckerService,
    },

    // =================================================================
    // Domain Services
    // =================================================================

    // File Validation Service
    FileValidationService,
    {
      provide: FILE_VALIDATION_SERVICE_TOKEN,
      useExisting: FileValidationService,
    },

    // =================================================================
    // Write Side (Command)
    // =================================================================

    // Repository Implementation (Adapter)
    FileRepository,
    {
      provide: FILE_REPOSITORY_TOKEN,
      useExisting: FileRepository,
    },

    // Command Handlers
    ...CommandHandlers,

    // =================================================================
    // Read Side (Query)
    // =================================================================

    // Read DAO Implementation (Adapter)
    FileReadDao,
    {
      provide: FILE_READ_DAO_TOKEN,
      useExisting: FileReadDao,
    },

    // Query Handlers
    ...QueryHandlers,
  ],
  exports: [
    FILE_REPOSITORY_TOKEN,
    FILE_READ_DAO_TOKEN,
    FILE_RULES_CHECKER_TOKEN,
    FILE_VALIDATION_SERVICE_TOKEN,
  ],
})
export class FileModule {}
