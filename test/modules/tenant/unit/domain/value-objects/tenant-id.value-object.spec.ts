import { TenantId } from '../../../../../../src/modules/tenant/domain/value-objects/tenant-id.value-object';
import { DomainException } from '@core/domain';

describe('TenantId Value Object', () => {
  describe('constructor', () => {
    it('should create a valid TenantId', () => {
      const id = new TenantId('tenant-123');

      expect(id.value).toBe('tenant-123');
    });

    it('should accept UUID format', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const id = new TenantId(uuid);

      expect(id.value).toBe(uuid);
    });

    it('should throw DomainException for empty value', () => {
      expect(() => new TenantId('')).toThrow(DomainException);
      expect(() => new TenantId('')).toThrow('Tenant ID cannot be empty');
    });

    it('should throw DomainException for whitespace-only value', () => {
      expect(() => new TenantId('   ')).toThrow(DomainException);
      expect(() => new TenantId('   ')).toThrow('Tenant ID cannot be empty');
    });

    it('should throw DomainException for value exceeding 36 characters', () => {
      const longId = 'a'.repeat(37);

      expect(() => new TenantId(longId)).toThrow(DomainException);
      expect(() => new TenantId(longId)).toThrow(
        'Tenant ID cannot exceed 36 characters',
      );
    });

    it('should accept value with exactly 36 characters (UUID length)', () => {
      const exactId = '550e8400-e29b-41d4-a716-446655440000';
      const id = new TenantId(exactId);

      expect(id.value).toBe(exactId);
    });
  });

  describe('equals', () => {
    it('should return true for same value', () => {
      const id1 = new TenantId('tenant-123');
      const id2 = new TenantId('tenant-123');

      expect(id1.equals(id2)).toBe(true);
    });

    it('should return false for different values', () => {
      const id1 = new TenantId('tenant-123');
      const id2 = new TenantId('tenant-456');

      expect(id1.equals(id2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the value as string', () => {
      const id = new TenantId('tenant-123');

      expect(id.toString()).toBe('tenant-123');
    });
  });
});
