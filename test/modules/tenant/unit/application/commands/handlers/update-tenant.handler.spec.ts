import { UpdateTenantHandler } from '../../../../../../../src/modules/tenant/application/commands/handlers/update-tenant.handler';
import { UpdateTenantCommand } from '../../../../../../../src/modules/tenant/application/commands/update-tenant.command';
import { ITenantRepository } from '../../../../../../../src/modules/tenant/domain/repositories';
import { Tenant } from '../../../../../../../src/modules/tenant/domain/entities';
import { TenantId, TenantStatus } from '../../../../../../../src/modules/tenant/domain/value-objects';
import { NotFoundException } from '@nestjs/common';
import { DomainException } from '@core/domain';

describe('UpdateTenantHandler', () => {
  let handler: UpdateTenantHandler;
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

    handler = new UpdateTenantHandler(
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

  const validCommand: UpdateTenantCommand = {
    id: 'tenant-123',
    name: 'Updated Tenant Name',
    brandingConfig: {
      logo: 'https://example.com/logo.png',
      primaryColor: '#FF0000',
    },
    limits: {
      maxUsers: 100,
      maxContent: 1000,
    },
  };

  describe('execute', () => {
    it('should update tenant with valid data', async () => {
      const mockTenant = createMockTenant();
      mockTenantRepository.getById.mockResolvedValue(mockTenant);
      mockTenantRepository.save.mockImplementation(async (tenant) => tenant);

      await handler.execute(validCommand);

      expect(mockTenantRepository.getById).toHaveBeenCalledWith('tenant-123');
      expect(mockTenantRepository.save).toHaveBeenCalledWith(mockTenant);
      expect(mockTenant.name).toBe('Updated Tenant Name');
      expect(mockTenant.brandingConfig).toEqual(validCommand.brandingConfig);
      expect(mockTenant.limits).toEqual(validCommand.limits);
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

    it('should update only name when other fields not provided', async () => {
      const mockTenant = createMockTenant();
      mockTenantRepository.getById.mockResolvedValue(mockTenant);
      mockTenantRepository.save.mockImplementation(async (tenant) => tenant);

      const commandWithOnlyName: UpdateTenantCommand = {
        id: 'tenant-123',
        name: 'New Name Only',
        brandingConfig: undefined,
        limits: undefined,
      };

      await handler.execute(commandWithOnlyName);

      expect(mockTenant.name).toBe('New Name Only');
    });

    it('should update branding config', async () => {
      const mockTenant = createMockTenant();
      mockTenantRepository.getById.mockResolvedValue(mockTenant);
      mockTenantRepository.save.mockImplementation(async (tenant) => tenant);

      const newBranding = {
        logo: 'https://new.com/logo.png',
        primaryColor: '#00FF00',
      };

      await handler.execute({
        id: 'tenant-123',
        name: undefined,
        brandingConfig: newBranding,
        limits: undefined,
      });

      expect(mockTenant.brandingConfig).toEqual(newBranding);
    });

    it('should update limits', async () => {
      const mockTenant = createMockTenant();
      mockTenantRepository.getById.mockResolvedValue(mockTenant);
      mockTenantRepository.save.mockImplementation(async (tenant) => tenant);

      const newLimits = {
        maxUsers: 200,
        maxContent: 2000,
      };

      await handler.execute({
        id: 'tenant-123',
        name: undefined,
        brandingConfig: undefined,
        limits: newLimits,
      });

      expect(mockTenant.limits).toEqual(newLimits);
    });

    it('should pass event metadata from request context', async () => {
      const mockTenant = createMockTenant();
      mockTenantRepository.getById.mockResolvedValue(mockTenant);
      mockTenantRepository.save.mockImplementation(async (tenant: Tenant) => {
        const events = tenant.getDomainEvents();
        if (events.length > 0) {
          expect(events[0].metadata).toEqual({
            correlationId: 'corr-123',
            causationId: 'cause-123',
            userId: 'user-123',
          });
        }
        return tenant;
      });

      await handler.execute(validCommand);
    });

    it('should work without request context', async () => {
      const handlerWithoutContext = new UpdateTenantHandler(
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

    it('should throw DomainException when updating deleted tenant', async () => {
      const mockTenant = createMockTenant();
      mockTenant.delete();
      mockTenantRepository.getById.mockResolvedValue(mockTenant);

      await expect(handler.execute(validCommand)).rejects.toThrow(
        DomainException,
      );
      await expect(handler.execute(validCommand)).rejects.toThrow(
        'Cannot modify deleted tenant',
      );
    });
  });

  describe('error handling', () => {
    it('should not save when tenant not found', async () => {
      mockTenantRepository.getById.mockResolvedValue(null);

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
});
