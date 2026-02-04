import { DomainException } from '@core/domain';

export class RateLimitExceededException extends DomainException {
  constructor(limit: number, timeWindow: string) {
    super(
      `Rate limit exceeded: You can only post ${limit} comments per ${timeWindow}`,
      'RATE_LIMIT_EXCEEDED',
      { limit, timeWindow },
    );
  }
}
