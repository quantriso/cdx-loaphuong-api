import {
  TenantUniquenessService,
  ITenantUniquenessChecker,
} from '../../../../../../src/modules/tenant/domain/services/tenant-uniqueness.service';
import { ConflictException } from '@core/common';

describe('TenantUniquenessService', () => {
  let service: TenantUniquenessService;
  let mockChecker: jest.Mocked<ITenantUniquenessChecker>;

  beforeEach(() => {
    mockChecker = {
      isUnique: jest.fn(),
    };

    service = new TenantUniquenessService(mockChecker);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ensureSubdomainIsUnique', () => {
    it('should pass when subdomain is unique', async () => {
      mockChecker.isUnique.mockResolvedValue(true);

      await expect(
        service.ensureSubdomainIsUnique('test-tenant'),
      ).resolves.not.toThrow();

      expect(mockChecker.isUnique).toHaveBeenCalledWith(
        'subdomain',
        'test-tenant',
        undefined,
      );
    });

    it('should throw ConflictException when subdomain already exists', async () => {
      mockChecker.isUnique.mockResolvedValue(false);

      await expect(
        service.ensureSubdomainIsUnique('existing-tenant'),
      ).rejects.toThrow(ConflictException);

      await expect(
        service.ensureSubdomainIsUnique('existing-tenant'),
      ).rejects.toThrow(
        "Tenant with subdomain 'existing-tenant' already exists",
      );
    });

    it('should pass excludeId when provided', async () => {
      mockChecker.isUnique.mockResolvedValue(true);

      await service.ensureSubdomainIsUnique('test-tenant', 'tenant-123');

      expect(mockChecker.isUnique).toHaveBeenCalledWith(
        'subdomain',
        'test-tenant',
        'tenant-123',
      );
    });

    it('should allow same subdomain when updating (excludeId matches)', async () => {
      mockChecker.isUnique.mockResolvedValue(true);

      await expect(
        service.ensureSubdomainIsUnique('test-tenant', 'tenant-123'),
      ).resolves.not.toThrow();
    });
  });

  describe('ensureAdminEmailIsUnique', () => {
    it('should pass when admin email is unique', async () => {
      mockChecker.isUnique.mockResolvedValue(true);

      await expect(
        service.ensureAdminEmailIsUnique('admin@test.com'),
      ).resolves.not.toThrow();

      expect(mockChecker.isUnique).toHaveBeenCalledWith(
        'adminEmail',
        'admin@test.com',
        undefined,
      );
    });

    it('should throw ConflictException when admin email already exists', async () => {
      mockChecker.isUnique.mockResolvedValue(false);

      await expect(
        service.ensureAdminEmailIsUnique('existing@test.com'),
      ).rejects.toThrow(ConflictException);

      await expect(
        service.ensureAdminEmailIsUnique('existing@test.com'),
      ).rejects.toThrow(
        "Tenant with adminEmail 'existing@test.com' already exists",
      );
    });

    it('should pass excludeId when provided', async () => {
      mockChecker.isUnique.mockResolvedValue(true);

      await service.ensureAdminEmailIsUnique('admin@test.com', 'tenant-123');

      expect(mockChecker.isUnique).toHaveBeenCalledWith(
        'adminEmail',
        'admin@test.com',
        'tenant-123',
      );
    });
  });

  describe('validateUniqueness', () => {
    it('should pass when both subdomain and email are unique', async () => {
      mockChecker.isUnique.mockResolvedValue(true);

      await expect(
        service.validateUniqueness({
          subdomain: 'test-tenant',
          adminEmail: 'admin@test.com',
        }),
      ).resolves.not.toThrow();

      expect(mockChecker.isUnique).toHaveBeenCalledTimes(2);
      expect(mockChecker.isUnique).toHaveBeenCalledWith(
        'subdomain',
        'test-tenant',
        undefined,
      );
      expect(mockChecker.isUnique).toHaveBeenCalledWith(
        'adminEmail',
        'admin@test.com',
        undefined,
      );
    });

    it('should throw ConflictException when subdomain is not unique', async () => {
      mockChecker.isUnique
        .mockResolvedValueOnce(false) // subdomain not unique
        .mockResolvedValueOnce(true); // email unique

      await expect(
        service.validateUniqueness({
          subdomain: 'existing-tenant',
          adminEmail: 'admin@test.com',
        }),
      ).rejects.toThrow(ConflictException);

      await expect(
        service.validateUniqueness({
          subdomain: 'existing-tenant',
          adminEmail: 'admin@test.com',
        }),
      ).rejects.toThrow(
        "Tenant with subdomain 'existing-tenant' already exists",
      );
    });

    it('should throw ConflictException when email is not unique', async () => {
      mockChecker.isUnique
        .mockResolvedValueOnce(true) // subdomain unique
        .mockResolvedValueOnce(false); // email not unique

      await expect(
        service.validateUniqueness({
          subdomain: 'test-tenant',
          adminEmail: 'existing@test.com',
        }),
      ).rejects.toThrow(ConflictException);

      await expect(
        service.validateUniqueness({
          subdomain: 'test-tenant',
          adminEmail: 'existing@test.com',
        }),
      ).rejects.toThrow(
        "Tenant with adminEmail 'existing@test.com' already exists",
      );
    });

    it('should throw ConflictException with multiple violations when both are not unique', async () => {
      mockChecker.isUnique.mockResolvedValue(false); // Both not unique

      await expect(
        service.validateUniqueness({
          subdomain: 'existing-tenant',
          adminEmail: 'existing@test.com',
        }),
      ).rejects.toThrow(ConflictException);

      const error = await service
        .validateUniqueness({
          subdomain: 'existing-tenant',
          adminEmail: 'existing@test.com',
        })
        .catch((err) => err);

      expect(error).toBeInstanceOf(ConflictException);
      expect(error.message).toContain('existing-tenant');
      expect(error.message).toContain('existing@test.com');
      expect(error.details?.violations).toHaveLength(2);
    });

    it('should validate only subdomain when email not provided', async () => {
      mockChecker.isUnique.mockResolvedValue(true);

      await service.validateUniqueness({
        subdomain: 'test-tenant',
      });

      expect(mockChecker.isUnique).toHaveBeenCalledTimes(1);
      expect(mockChecker.isUnique).toHaveBeenCalledWith(
        'subdomain',
        'test-tenant',
        undefined,
      );
    });

    it('should validate only email when subdomain not provided', async () => {
      mockChecker.isUnique.mockResolvedValue(true);

      await service.validateUniqueness({
        adminEmail: 'admin@test.com',
      });

      expect(mockChecker.isUnique).toHaveBeenCalledTimes(1);
      expect(mockChecker.isUnique).toHaveBeenCalledWith(
        'adminEmail',
        'admin@test.com',
        undefined,
      );
    });

    it('should pass excludeId to all checks', async () => {
      mockChecker.isUnique.mockResolvedValue(true);

      await service.validateUniqueness(
        {
          subdomain: 'test-tenant',
          adminEmail: 'admin@test.com',
        },
        'tenant-123',
      );

      expect(mockChecker.isUnique).toHaveBeenCalledWith(
        'subdomain',
        'test-tenant',
        'tenant-123',
      );
      expect(mockChecker.isUnique).toHaveBeenCalledWith(
        'adminEmail',
        'admin@test.com',
        'tenant-123',
      );
    });

    it('should not throw when no fields provided', async () => {
      await expect(service.validateUniqueness({})).resolves.not.toThrow();

      expect(mockChecker.isUnique).not.toHaveBeenCalled();
    });

    it('should collect all violations before throwing', async () => {
      mockChecker.isUnique.mockResolvedValue(false);

      await expect(
        service.validateUniqueness({
          subdomain: 'dup-subdomain',
          adminEmail: 'dup@test.com',
        }),
      ).rejects.toThrow(ConflictException);

      // Both checks should be called even if first fails
      expect(mockChecker.isUnique).toHaveBeenCalledTimes(2);
    });

    it('should have correct error code for uniqueness violations', async () => {
      mockChecker.isUnique.mockResolvedValue(false);

      const error = await service
        .validateUniqueness({
          subdomain: 'test',
          adminEmail: 'test@test.com',
        })
        .catch((err) => err);

      expect(error.code).toBe('TENANT_UNIQUENESS_VIOLATION');
    });

    it('should have correct details in error', async () => {
      mockChecker.isUnique.mockResolvedValue(false);

      const error = await service
        .validateUniqueness({
          subdomain: 'test-tenant',
          adminEmail: 'test@test.com',
        })
        .catch((err) => err);

      expect(error.details).toEqual({
        resourceType: 'Tenant',
        violations: [
          { field: 'subdomain', value: 'test-tenant' },
          { field: 'adminEmail', value: 'test@test.com' },
        ],
      });
    });
  });

  describe('checker integration', () => {
    it('should propagate checker errors', async () => {
      mockChecker.isUnique.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(
        service.ensureSubdomainIsUnique('test-tenant'),
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle checker returning undefined', async () => {
      mockChecker.isUnique.mockResolvedValue(undefined as any);

      await expect(
        service.ensureSubdomainIsUnique('test-tenant'),
      ).rejects.toThrow(ConflictException);
    });
  });
});
