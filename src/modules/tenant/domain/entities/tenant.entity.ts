import { AggregateRoot, ISoftDeletable, DomainException, IEventMetadata } from "@core/domain";
import { TenantCreatedEvent } from "../events/tenant-created.event";
import { TenantDeletedEvent } from "../events/tenant-deleted.event";
import { TenantStatus, TenantStatusEnum, TenantId } from "../value-objects";

export interface BrandingConfig {
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  [key: string]: any;
}

export interface TenantLimits {
  maxUsers?: number;
  maxContent?: number;
  maxStorage?: number;
  [key: string]: any;
}

/**
 * Interface defining Tenant data
 * Groups all tenant properties for cleaner constructor and reconstitute methods
 */
export interface TenantProps {
  name: string;
  subdomain: string;
  adminEmail: string;
  status: TenantStatus;
  adminPasswordHash: string;
  brandingConfig: BrandingConfig | null;
  limits: TenantLimits | null;
  createdBy: string | null;
}

/**
 * Tenant Aggregate Root
 *
 * Implements DDD Aggregate pattern with:
 * - Encapsulated state with private properties
 * - Business methods with semantic naming
 * - Domain event emission for each business action
 * - Invariant validation within the aggregate
 * - Soft delete pattern with restore capability
 */
export class Tenant extends AggregateRoot implements ISoftDeletable {
  private _tenantId: TenantId;  // ✅ ADD: Store TenantId Value Object
  private _props: TenantProps;
  private _deletedAt?: Date | null = null;

  /**
   * Private constructor - use factory methods instead
   */
  private constructor(
    id: TenantId,
    props: TenantProps,
    version: number = 1,
    createdAt: Date = new Date(),
    updatedAt: Date = new Date(),
    deletedAt?: Date | null,
  ) {
    super(id.value, version, createdAt, updatedAt);
    this._tenantId = id;  // ✅ ADD: Store TenantId object
    this._props = props;
    this._deletedAt = deletedAt;
  }

  // --- Soft Delete Implementation ---

  get deletedAt(): Date | null {
    return this._deletedAt ?? null;
  }

  get isDeleted(): boolean {
    return !!this._deletedAt;
  }

  /**
   * Soft delete the tenant
   * Emits TenantDeletedEvent
   */
  delete(metadata?: IEventMetadata): void {
    if (this.isDeleted) {
      return; // Already deleted, do nothing
    }

    // ✅ Use Value Object state machine for status transition
    this._props.status = this._props.status.transitionTo(TenantStatusEnum.DELETED);
    this._deletedAt = new Date();

    // addDomainEvent() already calls markAsUpdated() which increments version
    // No need to call markAsModified() here to avoid double increment
    this.addDomainEvent(
      new TenantDeletedEvent(this.id, {
        id: this.id,
        subdomain: this._props.subdomain,
      }, metadata)
    );
  }

  /**
   * Alias for delete() - for backwards compatibility
   */
  softDelete(metadata?: IEventMetadata): void {
    this.delete(metadata);
  }

  /**
   * Restore a soft-deleted tenant
   */
  restore(): void {
    if (!this.isDeleted) return;

    // ✅ Use Value Object state machine for status transition
    this._props.status = this._props.status.transitionTo(TenantStatusEnum.ACTIVE);
    this._deletedAt = null;
    this.markAsModified();
  }

  // --- Factory Methods ---

  /**
   * Factory method: Create new Tenant
   *
   * @param params Tenant creation parameters
   * @param metadata Optional event metadata for distributed tracing
   */
  static create(params: {
    id: TenantId;
    name: string;
    subdomain: string;
    adminEmail: string;
    adminPasswordHash: string;
    brandingConfig?: BrandingConfig | null;
    limits?: TenantLimits | null;
    createdBy?: string | null;
  }, metadata?: IEventMetadata): Tenant {
    // Validation
    this.validateName(params.name);
    this.validateSubdomain(params.subdomain);
    this.validateEmail(params.adminEmail);

    const now = new Date();
    const tenant = new Tenant(
      params.id,
      {
        name: params.name,
        subdomain: params.subdomain,
        adminEmail: params.adminEmail,
        status: TenantStatus.active(), // ✅ Use Value Object factory method
        adminPasswordHash: params.adminPasswordHash,
        brandingConfig: params.brandingConfig || null,
        limits: params.limits || null,
        createdBy: params.createdBy || null,
      },
      0,
      now,
      now,
      null,
    );

    // Emit Domain Event
    tenant.addDomainEvent(
      new TenantCreatedEvent(
        tenant.id,
        {
          id: tenant.id,
          name: tenant.name,
          subdomain: tenant.subdomain,
          adminEmail: tenant.adminEmail,
        },
        metadata,
      )
    );

    return tenant;
  }

  /**
   * Factory method: Reconstitute Tenant from database
   * Does NOT emit events - this is for hydration only
   */
  static reconstitute(params: {
    id: string;
    name: string;
    subdomain: string;
    adminEmail: string;
    status: TenantStatus;
    adminPasswordHash: string;
    brandingConfig: BrandingConfig | null;
    limits: TenantLimits | null;
    createdBy: string | null;
    deletedAt: Date | null;
    version: number;
    createdAt: Date;
    updatedAt: Date;
  }): Tenant {
    return new Tenant(
      new TenantId(params.id),
      {
        name: params.name,
        subdomain: params.subdomain,
        adminEmail: params.adminEmail,
        status: params.status,
        adminPasswordHash: params.adminPasswordHash,
        brandingConfig: params.brandingConfig,
        limits: params.limits,
        createdBy: params.createdBy,
      },
      params.version,
      params.createdAt,
      params.updatedAt,
      params.deletedAt,
    );
  }

  // --- Getters (Exposure) ---
  // Return primitive types or Value Objects (Immutable) to protect internal state

  get name(): string {
    return this._props.name;
  }

  get subdomain(): string {
    return this._props.subdomain;
  }

  get adminEmail(): string {
    return this._props.adminEmail;
  }

  get status(): TenantStatus {
    return this._props.status;
  }

  get adminPasswordHash(): string {
    return this._props.adminPasswordHash;
  }

  get brandingConfig(): BrandingConfig | null {
    return this._props.brandingConfig;
  }

  get limits(): TenantLimits | null {
    return this._props.limits;
  }

  get createdBy(): string | null {
    return this._props.createdBy;
  }

  /**
   * Get TenantId Value Object
   */
  get tenantId(): TenantId {
    return this._tenantId;
  }

  // --- Computed Properties ---

  isActive(): boolean {
    return this._props.status.isActive() && !this.isDeleted;
  }

  isSuspended(): boolean {
    return this._props.status.isSuspended();
  }

  // --- Business Behaviors (Actions) ---

  /**
   * Update tenant configuration
   *
   * @param params Fields to update
   * @param metadata Optional event metadata for tracing
   */
  updateConfig(params: {
    name?: string;
    brandingConfig?: BrandingConfig;
    limits?: TenantLimits;
  }, metadata?: IEventMetadata): void {
    this.ensureNotDeleted();

    let hasChanges = false;

    if (params.name !== undefined && params.name !== this._props.name) {
      Tenant.validateName(params.name);
      this._props.name = params.name;
      hasChanges = true;
    }

    if (params.brandingConfig !== undefined) {
      this._props.brandingConfig = {
        ...this._props.brandingConfig,
        ...params.brandingConfig,
      };
      hasChanges = true;
    }

    if (params.limits !== undefined) {
      this._props.limits = {
        ...this._props.limits,
        ...params.limits,
      };
      hasChanges = true;
    }

    if (hasChanges) {
      this.markAsModified();
    }
  }

  /**
   * Update admin password
   *
   * @param newPasswordHash New hashed password
   * @param metadata Optional event metadata for tracing
   */
  updatePassword(newPasswordHash: string, metadata?: IEventMetadata): void {
    this.ensureNotDeleted();

    if (!newPasswordHash || newPasswordHash.trim().length === 0) {
      throw new DomainException("Password hash is required");
    }

    this._props.adminPasswordHash = newPasswordHash;
    this.markAsModified();
  }

  /**
   * Suspend tenant
   *
   * @param metadata Optional event metadata for tracing
   */
  suspend(metadata?: IEventMetadata): void {
    this.ensureNotDeleted();

    if (this._props.status.isSuspended()) {
      return; // Already suspended
    }

    // ✅ Use Value Object state machine for status transition
    this._props.status = this._props.status.transitionTo(TenantStatusEnum.SUSPENDED);
    this.markAsModified();
  }

  /**
   * Activate tenant
   *
   * @param metadata Optional event metadata for tracing
   */
  activate(metadata?: IEventMetadata): void {
    this.ensureNotDeleted();

    if (this._props.status.isActive()) {
      return; // Already active
    }

    // ✅ Use Value Object state machine for status transition
    this._props.status = this._props.status.transitionTo(TenantStatusEnum.ACTIVE);
    this.markAsModified();
  }

  // --- Internal Validators (Invariants) ---

  private ensureNotDeleted(): void {
    if (this.isDeleted) {
      throw new DomainException("Cannot modify deleted tenant");
    }
  }

  private static validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new DomainException("Tenant name is required");
    }
    if (name.length > 255) {
      throw new DomainException("Tenant name cannot exceed 255 characters");
    }
  }

  private static validateSubdomain(subdomain: string): void {
    if (!subdomain || subdomain.trim().length === 0) {
      throw new DomainException("Tenant subdomain is required");
    }
    if (subdomain.length > 100) {
      throw new DomainException("Subdomain cannot exceed 100 characters");
    }
    // Validate subdomain format (lowercase, alphanumeric, hyphens)
    if (!/^[a-z0-9-]+$/.test(subdomain)) {
      throw new DomainException("Tenant subdomain must be lowercase alphanumeric with hyphens");
    }
  }

  private static validateEmail(email: string): void {
    if (!email || email.trim().length === 0) {
      throw new DomainException("Admin email is required");
    }
    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new DomainException("Invalid admin email format");
    }
  }
}
