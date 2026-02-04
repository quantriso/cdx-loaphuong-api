import { Module } from '@nestjs/common';
import { SharedCqrsModule, SharedModule } from '@shared';
import { ContentModule } from '../content/content.module';
import {
  COMMENT_REPOSITORY_TOKEN,
  COMMENT_READ_DAO_TOKEN,
  COMMENT_VALIDATION_SERVICE_TOKEN,
  CONTENT_SERVICE_TOKEN,
  CONTENT_AVAILABILITY_CHECKER_TOKEN,
  CONTENT_AVAILABILITY_SERVICE_TOKEN,
  THREAD_SERVICE_TOKEN,
} from './constants';

// Domain
import { CommentRepository } from './infrastructure/persistence/write/comment.repository';
import type { CommentRepositoryInterface } from './domain/repositories/comment.repository.interface';

// Application - Commands
import { CreateCommentHandler } from './application/commands/handlers/create-comment.handler';

// Application - Queries
import { GetCommentsHandler } from './application/queries/handlers/get-comments.handler';
import { GetCommentByIdHandler } from './application/queries/handlers/get-comment-by-id.handler';
import { GetCommentThreadHandler } from './application/queries/handlers/get-comment-thread.handler';

// Domain Services
import { CommentValidationService } from './domain/services/comment-validation.service';
import { ContentService } from './domain/services/content.service';
import {
  ContentAvailabilityService,
  type IContentAvailabilityChecker,
} from './domain/services/content-availability.service';
import { ThreadService } from './domain/services/thread.service';

// Infrastructure - Services
import { ContentAvailabilityChecker } from './infrastructure/content-availability-checker';

// Infrastructure - HTTP
import { CommentController } from './infrastructure/http/comment.controller';

// Infrastructure - Persistence - Read (CQRS)
import { CommentReadDao } from './infrastructure/persistence/read/comment-read-dao';

// Infrastructure - Schema
import * as commentSchema from './infrastructure/persistence/drizzle/schema/comment.schema';

/**
 * Comment Module
 *
 * Story 6.1: Add comments on published content
 * Story 6.2: Reply to comment
 *
 * This module provides functionality for:
 * - Creating comments on published content
 * - Retrieving comments for content
 * - Supporting nested comments (replies) with thread depth validation
 * - User mentions in comments
 * - Comment moderation
 *
 * Architecture:
 * - Domain: Entity, value objects, domain services, events
 * - Application: Commands, queries, handlers, DTOs
 * - Infrastructure: Repository, controller, Drizzle schema
 */
@Module({
  imports: [SharedCqrsModule, SharedModule, ContentModule],
  controllers: [CommentController],
  providers: [
    // Repository (Write side - CQRS)
    {
      provide: COMMENT_REPOSITORY_TOKEN,
      useFactory: (db) => {
        return new CommentRepository(db);
      },
      inject: ['DatabaseProvider'],
    },
    {
      provide: 'CommentRepositoryInterface',
      useExisting: COMMENT_REPOSITORY_TOKEN,
    },

    // Read DAO (Query side - CQRS)
    {
      provide: COMMENT_READ_DAO_TOKEN,
      useFactory: (db) => {
        return new CommentReadDao(db);
      },
      inject: ['DatabaseProvider'],
    },

    // Infrastructure - Services (Adapters)
    {
      provide: CONTENT_AVAILABILITY_CHECKER_TOKEN,
      useClass: ContentAvailabilityChecker,
    },

    // Domain Services
    {
      provide: COMMENT_VALIDATION_SERVICE_TOKEN,
      useClass: CommentValidationService,
    },
    {
      provide: CONTENT_SERVICE_TOKEN,
      useClass: ContentService,
    },
    {
      provide: CONTENT_AVAILABILITY_SERVICE_TOKEN,
      useFactory: (checker: IContentAvailabilityChecker) => {
        return new ContentAvailabilityService(checker);
      },
      inject: [CONTENT_AVAILABILITY_CHECKER_TOKEN],
    },
    {
      provide: THREAD_SERVICE_TOKEN,
      useClass: ThreadService,
    },

    // Command Handlers
    CreateCommentHandler,

    // Query Handlers
    GetCommentsHandler,
    GetCommentByIdHandler,
    GetCommentThreadHandler,
  ],
  exports: [
    COMMENT_REPOSITORY_TOKEN,
    COMMENT_READ_DAO_TOKEN,
    COMMENT_VALIDATION_SERVICE_TOKEN,
    CONTENT_SERVICE_TOKEN,
    CONTENT_AVAILABILITY_CHECKER_TOKEN,
    CONTENT_AVAILABILITY_SERVICE_TOKEN,
    THREAD_SERVICE_TOKEN,
  ],
})
export class CommentModule {
  constructor() {
    // Register Drizzle schema
    // This will be picked up by the DatabaseModule for migration generation
    commentSchema;
  }
}
