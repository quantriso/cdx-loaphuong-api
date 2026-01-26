import { Module, Global } from '@nestjs/common';
import { CACHE_SERVICE_TOKEN } from '@core/constants';
import { ICacheService } from './cache.interface';
import { MemoryCacheService } from './memory-cache.service';
import { RedisCacheService } from './redis-cache.service';

/**
 * Caching Module
 *
 * Provides caching functionality for the application.
 * Uses MemoryCacheService by default for development/testing.
 * RedisCacheService can be configured for production.
 *
 * Usage:
 * - Import CachingModule in your module
 * - Inject ICacheService with CACHE_SERVICE_TOKEN
 *
 * @example
 * ```typescript
 * constructor(
 *   @Inject(CACHE_SERVICE_TOKEN)
 *   private readonly cacheService: ICacheService,
 * ) {}
 * ```
 */
@Global()
@Module({
  providers: [
    {
      provide: CACHE_SERVICE_TOKEN,
      useClass: MemoryCacheService, // Use MemoryCacheService by default
      // For Redis, use: useClass: RedisCacheService
    },
  ],
  exports: [CACHE_SERVICE_TOKEN],
})
export class CachingModule {}
