import { CreateTenantHandler } from '../../../../../../../src/modules/tenant/application/commands/handlers/create-tenant.handler';
import { CreateTenantCommand } from '../../../../../../../src/modules/tenant/application/commands/create-tenant.command';
import { ITenantRepository } from '../../../../../../../src/modules/tenant/domain/repositories';
import { ITenantUniquenessChecker } from '../../../../../../../src/modules/tenant/domain/services';
import { Tenant } from '../../../../../../../src/modules/tenant/domain/entities';
import { ConflictException } from '@core/common';
import * as passwordUtil from '@shared/security';

// Mock password util
jest.mock('@shared/security', () => ({
  hashPassword: jest.fn(),
}));

describe('CreateTenantHandler', () => {
  let handler: CreateTenantHandler;
  let mockTenantRepository: jest.Mocked<ITenantRepository>;
  let mockUniquenessChecker: jest.Mocked<ITenantUniquenessChecker>;
  let mockRequestContext: any;

  beforeEach(() => {
    mockTenantRepository = {
      save: jest.fn(),
      getById: jest.fn(),
      delete: jest.fn(),
      existsBySubdomain: jest.fn(),
    } as any;

    mockUniquenessChecker = {
      isUnique: jest.fn(),
    };

    mockRequestContext = {
      current: jest.fn().mockReturnValue({
        correlationId: 'corr-123',
        causationId: 'cause-123',
        userId: 'user-123',
      }),
    };

    handler = new CreateTenantHandler(
      mockTenantRepository,
      mockUniquenessChecker,
      mockRequestContext,
    );

    // Mock hashPassword
    (passwordUtil.hashPassword as jest.Mock).mockResolvedValue(
      'hashed-password-123',
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const validCommand: CreateTenantCommand = {
    name: 'Test Tenant',
    subdomain: 'test-tenant',
    adminEmail: 'admin@test-tenant.com',
    adminPassword: 'SecurePass123!',
    brandingConfig: null,
    limits: null,
    createdBy: 'system',
  };

  describe('execute', () => {
    it('should create tenant with valid data', async () => {
      mockUniquenessChecker.isUnique.mockResolvedValue(true);
      mockTenantRepository.save.mockImplementation(async (tenant) => tenant);

      const result = await handler.execute(validCommand);

      expect(typeof result).toBe('string');
      expect(result).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      ); // UUID format
    });

    it('should validate subdomain uniqueness', async () => {
      mockUniquenessChecker.isUnique.mockResolvedValue(true);
      mockTenantRepository.save.mockImplementation(async (tenant) => tenant);

      await handler.execute(validCommand);

      expect(mockUniquenessChecker.isUnique).toHaveBeenCalledWith(
        'subdomain',
        'test-tenant',
        undefined,
      );
    });

    it('should validate admin email uniqueness', async () => {
      mockUniquenessChecker.isUnique.mockResolvedValue(true);
      mockTenantRepository.save.mockImplementation(async (tenant) => tenant);

      await handler.execute(validCommand);

      expect(mockUniquenessChecker.isUnique).toHaveBeenCalledWith(
        'adminEmail',
        'admin@test-tenant.com',
        undefined,
      );
    });

    it('should throw ConflictException if subdomain already exists', async () => {
      mockUniquenessChecker.isUnique
        .mockResolvedValueOnce(false) // subdomain not unique
        .mockResolvedValueOnce(true); // email unique

      await expect(handler.execute(validCommand)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException if admin email already exists', async () => {
      mockUniquenessChecker.isUnique
        .mockResolvedValueOnce(true) // subdomain unique
        .mockResolvedValueOnce(false); // email not unique

      await expect(handler.execute(validCommand)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should hash the admin password', async () => {
      mockUniquenessChecker.isUnique.mockResolvedValue(true);
      mockTenantRepository.save.mockImplementation(async (tenant) => tenant);

      await handler.execute(validCommand);

      expect(passwordUtil.hashPassword).toHaveBeenCalledWith(
        'SecurePass123!',
        12,
      );
    });

    it('should save tenant to repository', async () => {
      mockUniquenessChecker.isUnique.mockResolvedValue(true);
      mockTenantRepository.save.mockImplementation(async (tenant) => tenant);

      await handler.execute(validCommand);

      expect(mockTenantRepository.save).toHaveBeenCalledTimes(1);
      expect(mockTenantRepository.save).toHaveBeenCalledWith(
        expect.any(Tenant),
      );
    });

    it('should pass event metadata to domain entity', async () => {
      mockUniquenessChecker.isUnique.mockResolvedValue(true);
      mockTenantRepository.save.mockImplementation(async (tenant: Tenant) => {
        const events = tenant.getDomainEvents();
        expect(events).toHaveLength(1);
        expect(events[0].metadata).toEqual({
          correlationId: 'corr-123',
          causationId: 'cause-123',
          userId: 'user-123',
        });
        return tenant;
      });

      await handler.execute(validCommand);
    });

    it('should use system as createdBy if not provided', async () => {
      const commandWithoutCreatedBy = { ...validCommand, createdBy: undefined };
      mockUniquenessChecker.isUnique.mockResolvedValue(true);
      mockTenantRepository.save.mockImplementation(async (tenant: Tenant) => {
        expect(tenant.createdBy).toBe('system');
        return tenant;
      });

      await handler.execute(commandWithoutCreatedBy);
    });

    it('should use provided createdBy if specified', async () => {
      const commandWithCreatedBy = { ...validCommand, createdBy: 'user-456' };
      mockUniquenessChecker.isUnique.mockResolvedValue(true);
      mockTenantRepository.save.mockImplementation(async (tenant: Tenant) => {
        expect(tenant.createdBy).toBe('user-456');
        return tenant;
      });

      await handler.execute(commandWithCreatedBy);
    });

    it('should include branding config if provided', async () => {
      const brandingConfig = {
        logo: 'https://example.com/logo.png',
        primaryColor: '#FF0000',
      };
      const commandWithBranding = { ...validCommand, brandingConfig };
      mockUniquenessChecker.isUnique.mockResolvedValue(true);
      mockTenantRepository.save.mockImplementation(async (tenant: Tenant) => {
        expect(tenant.brandingConfig).toEqual(brandingConfig);
        return tenant;
      });

      await handler.execute(commandWithBranding);
    });

    it('should include limits if provided', async () => {
      const limits = {
        maxUsers: 100,
        maxContent: 1000,
        maxStorage: 5368709120,
      };
      const commandWithLimits = { ...validCommand, limits };
      mockUniquenessChecker.isUnique.mockResolvedValue(true);
      mockTenantRepository.save.mockImplementation(async (tenant: Tenant) => {
        expect(tenant.limits).toEqual(limits);
        return tenant;
      });

      await handler.execute(commandWithLimits);
    });

    it('should work without request context', async () => {
      const handlerWithoutContext = new CreateTenantHandler(
        mockTenantRepository,
        mockUniquenessChecker,
        undefined, // No request context
      );

      mockUniquenessChecker.isUnique.mockResolvedValue(true);
      mockTenantRepository.save.mockImplementation(async (tenant) => tenant);

      const result = await handlerWithoutContext.execute(validCommand);

      expect(typeof result).toBe('string');
    });
  });

  describe('error handling', () => {
    it('should not save tenant if subdomain validation fails', async () => {
      mockUniquenessChecker.isUnique.mockResolvedValue(false);

      await expect(handler.execute(validCommand)).rejects.toThrow();

      expect(mockTenantRepository.save).not.toHaveBeenCalled();
    });

    it('should not hash password if validation fails', async () => {
      mockUniquenessChecker.isUnique.mockResolvedValue(false);

      await expect(handler.execute(validCommand)).rejects.toThrow();

      expect(passwordUtil.hashPassword).not.toHaveBeenCalled();
    });
  });
});
