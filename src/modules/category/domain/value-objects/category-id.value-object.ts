import { BaseValueObject, DomainException } from '@core/domain';

/**
 * Category ID Value Object
 * Ensures category ID is always valid
 *
 * Using Value Object for ID provides:
 * - Type safety: Cannot mix CategoryId with other string types
 * - Validation: ID is always valid when constructed
 * - DDD best practice: IDs are Value Objects
 * - Immutability: ID cannot be changed after creation
 * - Future-proof: Can add sharding logic when needed
 *
 * Story 4.1: Manage Categories
 */
export class CategoryId extends BaseValueObject {
  constructor(public readonly value: string) {
    super();

    if (!value || value.trim().length === 0) {
      throw new DomainException('Category ID cannot be empty');
    }

    if (value.length > 36) {
      throw new DomainException('Category ID cannot exceed 36 characters');
    }
  }

  protected getEqualityComponents(): unknown[] {
    return [this.value];
  }

  toString(): string {
    return this.value;
  }

  /**
   * Generate a new Category ID
   * Uses crypto.randomUUID() for browser/Node.js compatibility
   */
  static generate(): CategoryId {
    return new CategoryId(crypto.randomUUID());
  }
}
