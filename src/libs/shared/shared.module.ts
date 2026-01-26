import { Module, Global } from '@nestjs/common';
import { SharedCqrsModule } from './cqrs';
import { LoggingModule } from './logging';
import { HealthModule } from './health';
import { CachingModule } from './caching';

/**
 * Shared Module
 *
 * Main module that bundles all shared implementations.
 * Import this module in your AppModule to get access to:
 * - CQRS (Command/Query/Event buses)
 * - Logging (Pino structured logging)
 * - Health checks
 * - Caching (In-memory or Redis)
 *
 * Note: Database module is not included here because it requires
 * application-specific schema configuration. Use DrizzleDatabaseModule.forRoot()
 * directly in your AppModule with your schema.
 */
import { OutboxModule } from './database/outbox/outbox.module';

@Global()
@Module({
  imports: [
    SharedCqrsModule,
    LoggingModule,
    HealthModule,
    OutboxModule,
    CachingModule,
  ],
  exports: [
    SharedCqrsModule,
    LoggingModule,
    HealthModule,
    OutboxModule,
    CachingModule,
  ],
})
export class SharedModule {}
