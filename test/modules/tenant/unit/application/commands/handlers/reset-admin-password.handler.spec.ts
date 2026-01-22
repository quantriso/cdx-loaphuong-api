import { ResetAdminPasswordHandler } from '../../../../../../../src/modules/tenant/application/commands/handlers/reset-admin-password.handler';
import { ResetAdminPasswordCommand } from '../../../../../../../src/modules/tenant/application/commands/reset-admin-password.command';
import { ITenantRepository } from '../../../../../../../src/modules/tenant/domain/repositories';
import { Tenant } from '../../../../../../../src/modules/tenant/domain/entities';
import { TenantId } from '../../../../../../../src/modules/tenant/domain/value-objects';
import { NotFoundException } from '@nestjs/common';

describe('ResetAdminPasswordHandler', () => {
  let handler: ResetAdminPasswordHandler;
  let mockTenantRepository: jest.Mocked<ITenantRepository>;
  let mockRequestContext: any;

  beforeEach(() => {
    mockTenantRepository = {
      save: jest.fn(),
      getById: jest.fn(),
      delete: jest.fn(),
      existsBySubdomain: jest.fn(),
    } as any;

    mockRequestContext = {
      current: jest.fn().mockReturnValue({
        correlationId: 'corr-123',
        causationId: 'cause-123',
        userId: 'user-123',
      }),
    };

    handler = new ResetAdminPasswordHandler(
      mockTenantRepository,
      mockRequestContext,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockTenant = (): Tenant => {
    const tenant = Tenant.create({
      id: new TenantId('tenant-123'),
      name: 'Test Tenant',
      subdomain: 'test-tenant',
      adminEmail: 'admin@test-tenant.com',
      adminPasswordHash: 'hashed-password-123',
      brandingConfig: null,
      limits: null,
      createdBy: 'system',
    });
    tenant.clearDomainEvents();
    return tenant;
  };

  const validCommand: ResetAdminPasswordCommand = {
    tenantId: 'tenant-123',
  };

  describe('execute', () => {
    it('should return tenant information when tenant exists', async () => {
      const mockTenant = createMockTenant();
      mockTenantRepository.getById.mockResolvedValue(mockTenant);

      const result = await handler.execute(validCommand);

      expect(mockTenantRepository.getById).toHaveBeenCalledWith('tenant-123');
      expect(result).toEqual({
        tenantId: 'test-tenant',
        adminEmail: 'admin@test-tenant.com',
        temporaryPassword: 'PLACEHOLDER_EPIC2',
        passwordReset: false,
      });
    });

    it('should throw NotFoundException when tenant does not exist', async () => {
      mockTenantRepository.getById.mockResolvedValue(null);

      await expect(handler.execute(validCommand)).rejects.toThrow(
        NotFoundException,
      );
      await expect(handler.execute(validCommand)).rejects.toThrow(
        'Tenant with id tenant-123 not found',
      );
    });

    it('should work without request context', async () => {
      const handlerWithoutContext = new ResetAdminPasswordHandler(
        mockTenantRepository,
        undefined, // No request context
      );

      const mockTenant = createMockTenant();
      mockTenantRepository.getById.mockResolvedValue(mockTenant);

      const result = await handlerWithoutContext.execute(validCommand);

      expect(result.tenantId).toBe('test-tenant');
      expect(result.adminEmail).toBe('admin@test-tenant.com');
    });

    it('should return correct tenant subdomain as tenantId', async () => {
      const mockTenant = createMockTenant();
      mockTenantRepository.getById.mockResolvedValue(mockTenant);

      const result = await handler.execute(validCommand);

      expect(result.tenantId).toBe(mockTenant.subdomain);
    });

    it('should return correct admin email', async () => {
      const mockTenant = createMockTenant();
      mockTenantRepository.getById.mockResolvedValue(mockTenant);

      const result = await handler.execute(validCommand);

      expect(result.adminEmail).toBe(mockTenant.adminEmail);
    });

    it('should indicate password not yet reset (Epic 2 placeholder)', async () => {
      const mockTenant = createMockTenant();
      mockTenantRepository.getById.mockResolvedValue(mockTenant);

      const result = await handler.execute(validCommand);

      expect(result.passwordReset).toBe(false);
      expect(result.temporaryPassword).toBe('PLACEHOLDER_EPIC2');
    });

    it('should work with deleted tenant', async () => {
      const mockTenant = createMockTenant();
      mockTenant.delete();
      mockTenantRepository.getById.mockResolvedValue(mockTenant);

      const result = await handler.execute(validCommand);

      expect(result.tenantId).toBe('test-tenant');
      expect(result.adminEmail).toBe('admin@test-tenant.com');
    });

    it('should work with suspended tenant', async () => {
      const mockTenant = createMockTenant();
      mockTenant.suspend();
      mockTenantRepository.getById.mockResolvedValue(mockTenant);

      const result = await handler.execute(validCommand);

      expect(result.tenantId).toBe('test-tenant');
      expect(result.adminEmail).toBe('admin@test-tenant.com');
    });
  });

  describe('error handling', () => {
    it('should propagate repository errors', async () => {
      mockTenantRepository.getById.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(handler.execute(validCommand)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('future implementation (Epic 2)', () => {
    it('should eventually reset admin password', async () => {
      // TODO: Epic 2 - This test will be updated when User module is implemented
      // Expected behavior:
      // 1. Find admin user by tenantId and role
      // 2. Generate new temporary password
      // 3. Hash and update password
      // 4. Raise PasswordResetEvent with eventMetadata
      // 5. Send email with temporary password
      // 6. Create audit log with correlationId
      // 7. Return passwordReset: true with actual temporary password

      const mockTenant = createMockTenant();
      mockTenantRepository.getById.mockResolvedValue(mockTenant);

      const result = await handler.execute(validCommand);

      // Current placeholder behavior
      expect(result.passwordReset).toBe(false);
      expect(result.temporaryPassword).toBe('PLACEHOLDER_EPIC2');
    });
  });
});
