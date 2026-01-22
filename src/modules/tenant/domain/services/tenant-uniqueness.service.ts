import { ITypedUniquenessChecker } from '@core/domain';
import { ConflictException } from '@core/common';

/**
 * Tenant Unique Fields
 *
 * Các fields của Tenant cần đảm bảo tính duy nhất
 */
export type TenantUniqueFields = 'subdomain' | 'adminEmail';

/**
 * Tenant Uniqueness Checker Interface (Port)
 *
 * Interface cho việc kiểm tra tính duy nhất của Tenant.
 * Được định nghĩa ở Domain Layer.
 * Infrastructure Layer sẽ implement.
 */
export interface ITenantUniquenessChecker extends ITypedUniquenessChecker<TenantUniqueFields> {}

/**
 * Tenant Uniqueness Service
 *
 * Domain Service đảm bảo business rules:
 * - Tenant subdomain must be unique
 * - Tenant admin email should be unique (business policy)
 *
 * Tại sao đây là Domain Service?
 * - Business rule "unique subdomain" thuộc về Domain
 * - Logic này không thuộc về một Aggregate cụ thể
 * - Cần truy vấn database để validate → sử dụng Port interface
 *
 * Exception Strategy:
 * - Uses ConflictException (HTTP 409) for duplicate resources
 * - This is more semantically correct than DomainException
 * - ConflictException.duplicate() factory method provides structured error
 *
 * @example
 * ```typescript
 * // Trong Command Handler
 * const uniquenessService = new TenantUniquenessService(uniquenessChecker);
 * await uniquenessService.ensureSubdomainIsUnique(command.subdomain);
 *
 * // Nếu subdomain không unique, sẽ throw ConflictException
 * ```
 */
export class TenantUniquenessService {
  constructor(private readonly checker: ITenantUniquenessChecker) {}

  /**
   * Đảm bảo Tenant subdomain là duy nhất
   *
   * @param subdomain Tenant subdomain cần kiểm tra
   * @param excludeId ID của tenant đang update (để exclude khỏi check)
   * @throws ConflictException nếu subdomain đã tồn tại (HTTP 409)
   */
  async ensureSubdomainIsUnique(subdomain: string, excludeId?: string): Promise<void> {
    const isUnique = await this.checker.isUnique('subdomain', subdomain, excludeId);

    if (!isUnique) {
      // Use ConflictException.duplicate() for semantic correctness
      throw ConflictException.duplicate('Tenant', 'subdomain', subdomain);
    }
  }

  /**
   * Đảm bảo Tenant admin email là duy nhất (business policy)
   *
   * @param adminEmail Admin email cần kiểm tra
   * @param excludeId ID của tenant đang update
   * @throws ConflictException nếu email đã tồn tại (HTTP 409)
   */
  async ensureAdminEmailIsUnique(adminEmail: string, excludeId?: string): Promise<void> {
    const isUnique = await this.checker.isUnique('adminEmail', adminEmail, excludeId);

    if (!isUnique) {
      throw ConflictException.duplicate('Tenant', 'adminEmail', adminEmail);
    }
  }

  /**
   * Validate tất cả uniqueness constraints
   *
   * @param params Params cần validate
   * @param excludeId ID để exclude (khi update)
   * @throws ConflictException with all violations if any duplicates found
   */
  async validateUniqueness(
    params: { subdomain?: string; adminEmail?: string },
    excludeId?: string,
  ): Promise<void> {
    const violations: Array<{ field: string; value: string }> = [];

    if (params.subdomain) {
      const isSubdomainUnique = await this.checker.isUnique(
        'subdomain',
        params.subdomain,
        excludeId,
      );
      if (!isSubdomainUnique) {
        violations.push({ field: 'subdomain', value: params.subdomain });
      }
    }

    if (params.adminEmail) {
      const isEmailUnique = await this.checker.isUnique(
        'adminEmail',
        params.adminEmail,
        excludeId,
      );
      if (!isEmailUnique) {
        violations.push({ field: 'adminEmail', value: params.adminEmail });
      }
    }

    if (violations.length > 0) {
      const message = violations
        .map((v) => `Tenant with ${v.field} '${v.value}' already exists`)
        .join('; ');

      throw new ConflictException(message, 'TENANT_UNIQUENESS_VIOLATION', {
        resourceType: 'Tenant',
        violations,
      });
    }
  }
}
