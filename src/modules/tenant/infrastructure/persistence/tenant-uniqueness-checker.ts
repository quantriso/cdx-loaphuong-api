import { Injectable, Inject } from '@nestjs/common';
import { eq, and, ne } from 'drizzle-orm';
import {
  ITenantUniquenessChecker,
  TenantUniqueFields,
} from '../../domain/services';
import { tenantsTable } from './drizzle/schema';
import { DATABASE_READ_TOKEN, type DrizzleDB } from '@shared/database';

/**
 * Tenant Uniqueness Checker Implementation
 *
 * Adapter implementing ITenantUniquenessChecker port.
 * Uses Drizzle ORM to query the database.
 *
 * Note: Uses READ database connection for efficiency.
 */
@Injectable()
export class TenantUniquenessChecker implements ITenantUniquenessChecker {
  constructor(
    @Inject(DATABASE_READ_TOKEN)
    private readonly db: DrizzleDB,
  ) {}

  /**
   * Check if a field value is unique
   *
   * @param field Field to check ('subdomain' | 'adminEmail')
   * @param value Value to check
   * @param excludeId Optional ID to exclude (for updates)
   * @returns true if unique, false if exists
   */
  async isUnique(
    field: TenantUniqueFields,
    value: string,
    excludeId?: string,
  ): Promise<boolean> {
    const column = this.getColumn(field);
    if (!column) {
      throw new Error(`Unknown unique field: ${field}`);
    }

    const conditions = [eq(column, value)];

    // Exclude current tenant when updating
    if (excludeId) {
      conditions.push(ne(tenantsTable.id, excludeId));
    }

    // Check if any tenant exists with this value
    const result = await this.db
      .select({ id: tenantsTable.id })
      .from(tenantsTable)
      .where(and(...conditions))
      .limit(1);

    // Return true if no matching tenant found (value is unique)
    return result.length === 0;
  }

  /**
   * Map field name to Drizzle column
   */
  private getColumn(field: TenantUniqueFields) {
    const columnMap = {
      subdomain: tenantsTable.tenantId, // subdomain is stored in tenantId column
      adminEmail: tenantsTable.adminEmail,
    };

    return columnMap[field];
  }
}
