import { TenantStatus } from '../../../../../../src/modules/tenant/domain/value-objects/tenant-status.value-object';

describe('TenantStatus Enum', () => {
  describe('enum values', () => {
    it('should have ACTIVE status', () => {
      expect(TenantStatus.ACTIVE).toBe('ACTIVE');
    });

    it('should have SUSPENDED status', () => {
      expect(TenantStatus.SUSPENDED).toBe('SUSPENDED');
    });

    it('should have DELETED status', () => {
      expect(TenantStatus.DELETED).toBe('DELETED');
    });
  });

  describe('equality', () => {
    it('should match same status', () => {
      const status1 = TenantStatus.ACTIVE;
      const status2 = TenantStatus.ACTIVE;

      expect(status1).toBe(status2);
    });

    it('should not match different statuses', () => {
      const status1 = TenantStatus.ACTIVE;
      const status2 = TenantStatus.SUSPENDED;

      expect(status1).not.toBe(status2);
    });
  });

  describe('type safety', () => {
    it('should only allow valid enum values', () => {
      const validStatuses = ['ACTIVE', 'SUSPENDED', 'DELETED'];
      const enumValues = Object.values(TenantStatus);

      expect(enumValues).toEqual(expect.arrayContaining(validStatuses));
      expect(enumValues).toHaveLength(3);
    });
  });

  describe('string representation', () => {
    it('should convert to string correctly', () => {
      expect(String(TenantStatus.ACTIVE)).toBe('ACTIVE');
      expect(String(TenantStatus.SUSPENDED)).toBe('SUSPENDED');
      expect(String(TenantStatus.DELETED)).toBe('DELETED');
    });
  });
});
