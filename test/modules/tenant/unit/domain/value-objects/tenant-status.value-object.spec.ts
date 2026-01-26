import {
  TenantStatus,
  TenantStatusEnum,
} from '../../../../../../src/modules/tenant/domain/value-objects/tenant-status.value-object';
import { DomainException } from '@core/domain';

describe('TenantStatus Value Object', () => {
  describe('factory methods', () => {
    it('should create ACTIVE status', () => {
      const status = TenantStatus.active();

      expect(status.value).toBe(TenantStatusEnum.ACTIVE);
      expect(status.isActive()).toBe(true);
      expect(status.isSuspended()).toBe(false);
      expect(status.isDeleted()).toBe(false);
    });

    it('should create SUSPENDED status', () => {
      const status = TenantStatus.suspended();

      expect(status.value).toBe(TenantStatusEnum.SUSPENDED);
      expect(status.isActive()).toBe(false);
      expect(status.isSuspended()).toBe(true);
      expect(status.isDeleted()).toBe(false);
    });

    it('should create DELETED status', () => {
      const status = TenantStatus.deleted();

      expect(status.value).toBe(TenantStatusEnum.DELETED);
      expect(status.isActive()).toBe(false);
      expect(status.isSuspended()).toBe(false);
      expect(status.isDeleted()).toBe(true);
    });
  });

  describe('fromValue', () => {
    it('should create from ACTIVE enum value', () => {
      const status = TenantStatus.fromValue(TenantStatusEnum.ACTIVE);
      expect(status.value).toBe(TenantStatusEnum.ACTIVE);
    });

    it('should create from SUSPENDED enum value', () => {
      const status = TenantStatus.fromValue(TenantStatusEnum.SUSPENDED);
      expect(status.value).toBe(TenantStatusEnum.SUSPENDED);
    });

    it('should create from DELETED enum value', () => {
      const status = TenantStatus.fromValue(TenantStatusEnum.DELETED);
      expect(status.value).toBe(TenantStatusEnum.DELETED);
    });

    it('should throw error for invalid value', () => {
      expect(() => TenantStatus.fromValue('INVALID' as any)).toThrow(
        DomainException,
      );
    });
  });

  describe('equality', () => {
    it('should be equal for same status values', () => {
      const status1 = TenantStatus.active();
      const status2 = TenantStatus.active();

      expect(status1.equals(status2)).toBe(true);
    });

    it('should not be equal for different status values', () => {
      const status1 = TenantStatus.active();
      const status2 = TenantStatus.suspended();

      expect(status1.equals(status2)).toBe(false);
    });
  });

  describe('state transitions', () => {
    it('should allow ACTIVE -> SUSPENDED transition', () => {
      const active = TenantStatus.active();
      const suspended = active.transitionTo(TenantStatusEnum.SUSPENDED);

      expect(suspended.value).toBe(TenantStatusEnum.SUSPENDED);
    });

    it('should allow ACTIVE -> DELETED transition', () => {
      const active = TenantStatus.active();
      const deleted = active.transitionTo(TenantStatusEnum.DELETED);

      expect(deleted.value).toBe(TenantStatusEnum.DELETED);
    });

    it('should allow SUSPENDED -> ACTIVE transition', () => {
      const suspended = TenantStatus.suspended();
      const active = suspended.transitionTo(TenantStatusEnum.ACTIVE);

      expect(active.value).toBe(TenantStatusEnum.ACTIVE);
    });

    it('should allow SUSPENDED -> DELETED transition', () => {
      const suspended = TenantStatus.suspended();
      const deleted = suspended.transitionTo(TenantStatusEnum.DELETED);

      expect(deleted.value).toBe(TenantStatusEnum.DELETED);
    });

    it('should allow DELETED -> ACTIVE transition (restore)', () => {
      const deleted = TenantStatus.deleted();
      const active = deleted.transitionTo(TenantStatusEnum.ACTIVE);

      expect(active.value).toBe(TenantStatusEnum.ACTIVE);
    });

    it('should not allow DELETED -> SUSPENDED transition', () => {
      const deleted = TenantStatus.deleted();

      expect(() => deleted.transitionTo(TenantStatusEnum.SUSPENDED)).toThrow(
        DomainException,
      );
    });

    it('should allow same-state transition (no-op)', () => {
      const active = TenantStatus.active();
      const stillActive = active.transitionTo(TenantStatusEnum.ACTIVE);

      expect(stillActive.value).toBe(TenantStatusEnum.ACTIVE);
    });
  });

  describe('string representation', () => {
    it('should convert to string correctly', () => {
      expect(TenantStatus.active().toString()).toBe(TenantStatusEnum.ACTIVE);
      expect(TenantStatus.suspended().toString()).toBe(
        TenantStatusEnum.SUSPENDED,
      );
      expect(TenantStatus.deleted().toString()).toBe(TenantStatusEnum.DELETED);
    });
  });
});

describe('TenantStatusEnum', () => {
  it('should have correct enum values', () => {
    expect(TenantStatusEnum.ACTIVE).toBe('ACTIVE');
    expect(TenantStatusEnum.SUSPENDED).toBe('SUSPENDED');
    expect(TenantStatusEnum.DELETED).toBe('DELETED');
  });
});
