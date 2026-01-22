import { BaseValueObject, DomainException } from '@core/domain';

/**
 * Tenant ID Value Object
 * Ensures tenant ID is always valid
 *
 * Using Value Object for ID provides:
 * - Type safety: Cannot mix TenantId with other string types
 * - Validation: ID is always valid when constructed
 * - DDD best practice: IDs are Value Objects
 * - Immutability: ID cannot be changed after creation
 */
export class TenantId extends BaseValueObject {
  constructor(public readonly value: string) {
    super();

    if (!value || value.trim().length === 0) {
      throw new DomainException('Tenant ID cannot be empty');
    }

    if (value.length > 36) {
      throw new DomainException('Tenant ID cannot exceed 36 characters');
    }
  }

  protected getEqualityComponents(): unknown[] {
    return [this.value];
  }

  toString(): string {
    return this.value;
  }
}
