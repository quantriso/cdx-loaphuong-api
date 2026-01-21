import { Module, Global, OnModuleInit } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { DatabaseHealthIndicator } from './indicators/database.health-indicator';
import { RedisHealthIndicator } from './indicators/redis.health-indicator';
import { RabbitMQHealthIndicator } from './indicators/rabbitmq.health-indicator';
import { MinIOHealthIndicator } from './indicators/minio.health-indicator';

/**
 * Health Check Module
 * Provides health check endpoints and indicators
 */
@Global()
@Module({
  controllers: [HealthController],
  providers: [
    HealthService,
    DatabaseHealthIndicator,
    RedisHealthIndicator,
    RabbitMQHealthIndicator,
    MinIOHealthIndicator,
  ],
  exports: [
    HealthService,
    DatabaseHealthIndicator,
    RedisHealthIndicator,
    RabbitMQHealthIndicator,
    MinIOHealthIndicator,
  ],
})
export class HealthModule implements OnModuleInit {
  constructor(
    private readonly healthService: HealthService,
    private readonly databaseIndicator: DatabaseHealthIndicator,
    private readonly redisIndicator: RedisHealthIndicator,
    private readonly rabbitmqIndicator: RabbitMQHealthIndicator,
    private readonly minioIndicator: MinIOHealthIndicator,
  ) {}

  onModuleInit() {
    this.healthService.registerIndicator('database', this.databaseIndicator);
    this.healthService.registerIndicator('redis', this.redisIndicator);
    this.healthService.registerIndicator('rabbitmq', this.rabbitmqIndicator);
    this.healthService.registerIndicator('minio', this.minioIndicator);
  }
}
