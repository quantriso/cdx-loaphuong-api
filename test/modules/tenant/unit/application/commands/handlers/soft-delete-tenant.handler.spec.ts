import { SoftDeleteTenantHandler } from '../../../../../../../src/modules/tenant/application/commands/handlers/soft-delete-tenant.handler';
import { SoftDeleteTenantCommand } from '../../../../../../../src/modules/tenant/application/commands/soft-delete-tenant.command';
import { ITenantRepository } from '../../../../../../../src/modules/tenant/domain/repositories';
import { Tenant } from '../../../../../../../src/modules/tenant/domain/entities';
import { TenantId } from '../../../../../../../src/modules/tenant/domain/value-objects';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('SoftDeleteTenantHandler', () => {
  let handler: SoftDeleteTenantHandler;
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

    handler = new SoftDeleteTenantHandler(
      mockTenantRepository,
      mockRequestContext,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockTenant = (isDeleted = false): Tenant => {
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

    if (isDeleted) {
      tenant.delete();
      tenant.clearDomainEvents();
    }

    return tenant;
  };

  const validCommand = new SoftDeleteTenantCommand(
    'tenant-123',
    'Admin requested deletion',
  );

  describe('execute', () => {
    it('should soft delete tenant successfully', async () => {
      const mockTenant = createMockTenant();
      mockTenantRepository.getById.mockResolvedValue(mockTenant);
      mockTenantRepository.save.mockImplementation(async (tenant) => tenant);

      await handler.execute(validCommand);

      expect(mockTenantRepository.getById).toHaveBeenCalledWith('tenant-123');
      expect(mockTenant.isDeleted).toBe(true);
      expect(mockTenant.deletedAt).toBeInstanceOf(Date);
      expect(mockTenantRepository.save).toHaveBeenCalledWith(mockTenant);
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

    it('should throw ForbiddenException when tenant is already deleted', async () => {
      const deletedTenant = createMockTenant(true);
      mockTenantRepository.getById.mockResolvedValue(deletedTenant);

      await expect(handler.execute(validCommand)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(handler.execute(validCommand)).rejects.toThrow(
        'Tenant is already deleted',
      );
    });

    it('should emit TenantDeletedEvent', async () => {
      const mockTenant = createMockTenant();
      mockTenantRepository.getById.mockResolvedValue(mockTenant);
      mockTenantRepository.save.mockImplementation(async (tenant: Tenant) => {
        const events = tenant.getDomainEvents();
        expect(events).toHaveLength(1);
        expect(events[0].eventType).toBe('TenantDeleted');
        expect(events[0].aggregateId).toBe('tenant-123');
        return tenant;
      });

      await handler.execute(validCommand);
    });

    it('should pass event metadata from request context', async () => {
      const mockTenant = createMockTenant();
      mockTenantRepository.getById.mockResolvedValue(mockTenant);
      mockTenantRepository.save.mockImplementation(async (tenant: Tenant) => {
        const events = tenant.getDomainEvents();
        expect(events[0].metadata).toEqual({
          correlationId: 'corr-123',
          causationId: 'cause-123',
          userId: 'user-123',
        });
        return tenant;
      });

      await handler.execute(validCommand);
    });

    it('should work without request context', async () => {
      const handlerWithoutContext = new SoftDeleteTenantHandler(
        mockTenantRepository,
        undefined, // No request context
      );

      const mockTenant = createMockTenant();
      mockTenantRepository.getById.mockResolvedValue(mockTenant);
      mockTenantRepository.save.mockImplementation(async (tenant) => tenant);

      await expect(
        handlerWithoutContext.execute(validCommand),
      ).resolves.not.toThrow();
    });

    it('should update deletedAt timestamp', async () => {
      const mockTenant = createMockTenant();
      const beforeDelete = new Date();

      mockTenantRepository.getById.mockResolvedValue(mockTenant);
      mockTenantRepository.save.mockImplementation(async (tenant) => tenant);

      await handler.execute(validCommand);

      const afterDelete = new Date();
      expect(mockTenant.deletedAt).toBeDefined();
      expect(mockTenant.deletedAt!.getTime()).toBeGreaterThanOrEqual(
        beforeDelete.getTime(),
      );
      expect(mockTenant.deletedAt!.getTime()).toBeLessThanOrEqual(
        afterDelete.getTime(),
      );
    });
  });

  describe('error handling', () => {
    it('should not save when tenant not found', async () => {
      mockTenantRepository.getById.mockResolvedValue(null);

      await expect(handler.execute(validCommand)).rejects.toThrow();

      expect(mockTenantRepository.save).not.toHaveBeenCalled();
    });

    it('should not save when tenant is already deleted', async () => {
      const deletedTenant = createMockTenant(true);
      mockTenantRepository.getById.mockResolvedValue(deletedTenant);

      await expect(handler.execute(validCommand)).rejects.toThrow();

      expect(mockTenantRepository.save).not.toHaveBeenCalled();
    });

    it('should propagate repository errors', async () => {
      const mockTenant = createMockTenant();
      mockTenantRepository.getById.mockResolvedValue(mockTenant);
      mockTenantRepository.save.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(handler.execute(validCommand)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('business logic', () => {
    it('should maintain tenant subdomain after soft delete', async () => {
      const mockTenant = createMockTenant();
      const originalSubdomain = mockTenant.subdomain;

      mockTenantRepository.getById.mockResolvedValue(mockTenant);
      mockTenantRepository.save.mockImplementation(async (tenant) => tenant);

      await handler.execute(validCommand);

      expect(mockTenant.subdomain).toBe(originalSubdomain);
    });

    it('should maintain tenant data after soft delete', async () => {
      const mockTenant = createMockTenant();
      const originalName = mockTenant.name;
      const originalEmail = mockTenant.adminEmail;

      mockTenantRepository.getById.mockResolvedValue(mockTenant);
      mockTenantRepository.save.mockImplementation(async (tenant) => tenant);

      await handler.execute(validCommand);

      expect(mockTenant.name).toBe(originalName);
      expect(mockTenant.adminEmail).toBe(originalEmail);
    });
  });
});
