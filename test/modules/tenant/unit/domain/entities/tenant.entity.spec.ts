import { Tenant, TenantProps } from '../../../../../../src/modules/tenant/domain/entities/tenant.entity';
import { TenantId, TenantStatus } from '../../../../../../src/modules/tenant/domain/value-objects';
import { DomainException } from '@core/domain';

describe('Tenant Entity', () => {
  const createValidProps = (): Omit<
    Parameters<typeof Tenant.create>[0],
    'id'
  > => ({
    name: 'Test Tenant',
    subdomain: 'test-tenant',
    adminEmail: 'admin@test-tenant.com',
    adminPasswordHash: 'hashed-password-123',
    brandingConfig: null,
    limits: null,
    createdBy: 'system',
  });

  describe('create', () => {
    it('should create a valid tenant with all properties', () => {
      const id = new TenantId('tenant-123');
      const props = createValidProps();

      const tenant = Tenant.create({ id, ...props });

      expect(tenant.id).toBe('tenant-123');
      expect(tenant.name).toBe('Test Tenant');
      expect(tenant.subdomain).toBe('test-tenant');
      expect(tenant.adminEmail).toBe('admin@test-tenant.com');
      expect(tenant.adminPasswordHash).toBe('hashed-password-123');
      expect(tenant.status).toBe(TenantStatus.ACTIVE);
      expect(tenant.isDeleted).toBe(false);
      expect(tenant.createdBy).toBe('system');
    });

    it('should emit TenantCreatedEvent', () => {
      const id = new TenantId('tenant-123');
      const props = createValidProps();

      const tenant = Tenant.create({ id, ...props });
      const events = tenant.getDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('TenantCreated');
      expect(events[0].aggregateId).toBe('tenant-123');
    });

    it('should throw DomainException for empty name', () => {
      const id = new TenantId('tenant-123');
      const props = { ...createValidProps(), name: '' };

      expect(() => Tenant.create({ id, ...props })).toThrow(DomainException);
      expect(() => Tenant.create({ id, ...props })).toThrow(
        'Tenant name is required',
      );
    });

    it('should throw DomainException for name exceeding 255 characters', () => {
      const id = new TenantId('tenant-123');
      const props = { ...createValidProps(), name: 'a'.repeat(256) };

      expect(() => Tenant.create({ id, ...props })).toThrow(DomainException);
      expect(() => Tenant.create({ id, ...props })).toThrow(
        'Tenant name cannot exceed 255 characters',
      );
    });

    it('should throw DomainException for empty subdomain', () => {
      const id = new TenantId('tenant-123');
      const props = { ...createValidProps(), subdomain: '' };

      expect(() => Tenant.create({ id, ...props })).toThrow(DomainException);
      expect(() => Tenant.create({ id, ...props })).toThrow(
        'Tenant subdomain is required',
      );
    });

    it('should throw DomainException for invalid subdomain format', () => {
      const id = new TenantId('tenant-123');
      const props = { ...createValidProps(), subdomain: 'Invalid Subdomain!' };

      expect(() => Tenant.create({ id, ...props })).toThrow(DomainException);
      expect(() => Tenant.create({ id, ...props })).toThrow(
        'Tenant subdomain must be lowercase alphanumeric with hyphens',
      );
    });

    it('should throw DomainException for invalid email format', () => {
      const id = new TenantId('tenant-123');
      const props = { ...createValidProps(), adminEmail: 'invalid-email' };

      expect(() => Tenant.create({ id, ...props })).toThrow(DomainException);
      expect(() => Tenant.create({ id, ...props })).toThrow(
        'Invalid admin email format',
      );
    });

    it('should accept branding config', () => {
      const id = new TenantId('tenant-123');
      const brandingConfig = {
        logo: 'https://example.com/logo.png',
        primaryColor: '#FF0000',
        secondaryColor: '#0000FF',
      };
      const props = { ...createValidProps(), brandingConfig };

      const tenant = Tenant.create({ id, ...props });

      expect(tenant.brandingConfig).toEqual(brandingConfig);
    });

    it('should accept limits config', () => {
      const id = new TenantId('tenant-123');
      const limits = {
        maxUsers: 100,
        maxContent: 1000,
        maxStorage: 5368709120, // 5GB
      };
      const props = { ...createValidProps(), limits };

      const tenant = Tenant.create({ id, ...props });

      expect(tenant.limits).toEqual(limits);
    });
  });

  describe('reconstitute', () => {
    it('should reconstitute tenant from database data', () => {
      const now = new Date();
      const tenant = Tenant.reconstitute({
        id: 'tenant-123',
        name: 'Test Tenant',
        subdomain: 'test-tenant',
        adminEmail: 'admin@test.com',
        status: TenantStatus.ACTIVE,
        adminPasswordHash: 'hashed-pwd',
        brandingConfig: null,
        limits: null,
        createdBy: 'system',
        deletedAt: null,
        version: 5,
        createdAt: now,
        updatedAt: now,
      });

      expect(tenant.id).toBe('tenant-123');
      expect(tenant.version).toBe(5);
      expect(tenant.createdAt).toBe(now);
      expect(tenant.getDomainEvents()).toHaveLength(0); // No events on reconstitute
    });
  });

  describe('updateConfig', () => {
    it('should update tenant name', () => {
      const tenant = Tenant.create({
        id: new TenantId('tenant-123'),
        ...createValidProps(),
      });
      tenant.clearDomainEvents();

      tenant.updateConfig({ name: 'Updated Tenant Name' });

      expect(tenant.name).toBe('Updated Tenant Name');
    });

    it('should update branding config', () => {
      const tenant = Tenant.create({
        id: new TenantId('tenant-123'),
        ...createValidProps(),
      });
      tenant.clearDomainEvents();

      const newBranding = {
        logo: 'https://example.com/new-logo.png',
        primaryColor: '#00FF00',
      };
      tenant.updateConfig({ brandingConfig: newBranding });

      expect(tenant.brandingConfig).toEqual(newBranding);
    });

    it('should update limits', () => {
      const tenant = Tenant.create({
        id: new TenantId('tenant-123'),
        ...createValidProps(),
      });
      tenant.clearDomainEvents();

      const newLimits = {
        maxUsers: 200,
        maxContent: 2000,
      };
      tenant.updateConfig({ limits: newLimits });

      expect(tenant.limits).toEqual(newLimits);
    });

    it('should throw DomainException if tenant is deleted', () => {
      const tenant = Tenant.create({
        id: new TenantId('tenant-123'),
        ...createValidProps(),
      });
      tenant.delete();

      expect(() => tenant.updateConfig({ name: 'New Name' })).toThrow(
        DomainException,
      );
      expect(() => tenant.updateConfig({ name: 'New Name' })).toThrow(
        'Cannot modify deleted tenant',
      );
    });
  });

  describe('suspend', () => {
    it('should suspend an active tenant', () => {
      const tenant = Tenant.create({
        id: new TenantId('tenant-123'),
        ...createValidProps(),
      });
      tenant.clearDomainEvents();

      tenant.suspend();

      expect(tenant.status).toBe(TenantStatus.SUSPENDED);
    });

    it('should do nothing if already suspended', () => {
      const tenant = Tenant.create({
        id: new TenantId('tenant-123'),
        ...createValidProps(),
      });
      tenant.suspend();
      const versionAfterFirstSuspend = tenant.version;

      tenant.suspend(); // Suspend again

      expect(tenant.version).toBe(versionAfterFirstSuspend); // No change
    });

    it('should throw DomainException if tenant is deleted', () => {
      const tenant = Tenant.create({
        id: new TenantId('tenant-123'),
        ...createValidProps(),
      });
      tenant.delete();

      expect(() => tenant.suspend()).toThrow(DomainException);
    });
  });

  describe('activate', () => {
    it('should activate a suspended tenant', () => {
      const tenant = Tenant.create({
        id: new TenantId('tenant-123'),
        ...createValidProps(),
      });
      tenant.suspend();
      tenant.clearDomainEvents();

      tenant.activate();

      expect(tenant.status).toBe(TenantStatus.ACTIVE);
    });

    it('should do nothing if already active', () => {
      const tenant = Tenant.create({
        id: new TenantId('tenant-123'),
        ...createValidProps(),
      });
      const versionAfterCreate = tenant.version;

      tenant.activate(); // Try to activate when already active

      expect(tenant.version).toBe(versionAfterCreate); // No change
    });
  });

  describe('delete (soft delete)', () => {
    it('should soft delete the tenant', () => {
      const tenant = Tenant.create({
        id: new TenantId('tenant-123'),
        ...createValidProps(),
      });
      tenant.clearDomainEvents();

      tenant.delete();

      expect(tenant.isDeleted).toBe(true);
      expect(tenant.deletedAt).toBeInstanceOf(Date);
    });

    it('should emit TenantDeletedEvent', () => {
      const tenant = Tenant.create({
        id: new TenantId('tenant-123'),
        ...createValidProps(),
      });
      tenant.clearDomainEvents();

      tenant.delete();
      const events = tenant.getDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('TenantDeleted');
    });

    it('should not emit event if already deleted', () => {
      const tenant = Tenant.create({
        id: new TenantId('tenant-123'),
        ...createValidProps(),
      });
      tenant.delete();
      tenant.clearDomainEvents();

      tenant.delete(); // Try to delete again

      expect(tenant.getDomainEvents()).toHaveLength(0);
    });
  });

  describe('restore', () => {
    it('should restore a deleted tenant', () => {
      const tenant = Tenant.create({
        id: new TenantId('tenant-123'),
        ...createValidProps(),
      });
      tenant.delete();

      tenant.restore();

      expect(tenant.isDeleted).toBe(false);
      expect(tenant.deletedAt).toBeNull();
    });

    it('should do nothing if tenant is not deleted', () => {
      const tenant = Tenant.create({
        id: new TenantId('tenant-123'),
        ...createValidProps(),
      });

      tenant.restore();

      expect(tenant.isDeleted).toBe(false);
    });
  });

  describe('business methods', () => {
    it('isActive should return true for active non-deleted tenant', () => {
      const tenant = Tenant.create({
        id: new TenantId('tenant-123'),
        ...createValidProps(),
      });

      expect(tenant.isActive()).toBe(true);
    });

    it('isActive should return false for suspended tenant', () => {
      const tenant = Tenant.create({
        id: new TenantId('tenant-123'),
        ...createValidProps(),
      });
      tenant.suspend();

      expect(tenant.isActive()).toBe(false);
    });

    it('isActive should return false for deleted tenant', () => {
      const tenant = Tenant.create({
        id: new TenantId('tenant-123'),
        ...createValidProps(),
      });
      tenant.delete();

      expect(tenant.isActive()).toBe(false);
    });

    it('isSuspended should return true for suspended tenant', () => {
      const tenant = Tenant.create({
        id: new TenantId('tenant-123'),
        ...createValidProps(),
      });
      tenant.suspend();

      expect(tenant.isSuspended()).toBe(true);
    });
  });

  describe('version and concurrency', () => {
    it('should increment version on modifications', () => {
      const tenant = Tenant.create({
        id: new TenantId('tenant-123'),
        ...createValidProps(),
      });
      const initialVersion = tenant.version;

      tenant.updateConfig({ name: 'New Name' });

      expect(tenant.version).toBeGreaterThan(initialVersion);
    });
  });
});
