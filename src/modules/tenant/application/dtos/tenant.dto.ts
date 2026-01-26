/**
 * Tenant DTO for Read Operations
 *
 * Used by Query Handlers and Read DAO
 * Represents tenant data optimized for queries
 */
export class TenantDto {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly name: string,
    public readonly subdomain: string,
    public readonly status: string,
    public readonly adminEmail: string,
    public readonly brandingConfig: any,
    public readonly limits: any,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly deletedAt?: Date | null,
    public readonly deletedBy?: string | null,
  ) {}
}

/**
 * Paginated Tenant List Response DTO
 */
export class TenantListDto {
  constructor(
    public readonly items: TenantDto[],
    public readonly total: number,
    public readonly page: number,
    public readonly limit: number,
    public readonly totalPages: number,
  ) {}
}
