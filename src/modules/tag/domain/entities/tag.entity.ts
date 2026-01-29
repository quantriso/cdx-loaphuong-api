import { AggregateRoot } from '@core/domain';
import { DomainException } from '@core/common';
import { TagCreatedEvent } from '../events/tag-created.event';
import { TagUpdatedEvent } from '../events/tag-updated.event';
import { TagDeletedEvent } from '../events/tag-deleted.event';
import { TagUsedEvent } from '../events/tag-used.event';
import type { IEventMetadata } from '@core/domain';
import { TagId } from '../value-objects/tag-id.value-object';

/**
 * Tag Category Enum
 *
 * Story 4.3: Categories for organizing tags
 */
export enum TagCategory {
  GENERAL = 'GENERAL',
  EMERGENCY = 'EMERGENCY',
  SERVICES = 'SERVICES',
  ANNOUNCEMENTS = 'ANNOUNCEMENTS',
}

/**
 * Tag Properties
 *
 * Story 4.3: Create, Edit, Delete Tags
 */
export interface TagProps {
  name: string; // Display name (e.g., "Emergency", "Important")
  slug: string; // URL-safe identifier (e.g., "emergency", "important")
  description?: string;
  color?: string; // Hex color code (e.g., "#FF0000")
  category: TagCategory; // Tag category for organization
  synonyms: string[]; // Alternative names/keywords for the tag
  isActive: boolean;
  usageCount: number; // Number of times tag is used in content
  metadata?: Record<string, unknown>; // Extensible metadata
  tenantId: string;
}

/**
 * Tag Database Properties
 *
 * Includes id, version, timestamps, soft delete, and audit fields for reconstitution
 */
export interface TagDbProps extends TagProps {
  id: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;
  createdBy: string;
  updatedBy: string | null;
  category: TagCategory;
  synonyms: string[];
  usageCount: number;
  metadata?: Record<string, unknown>;
}

/**
 * Tag Entity (Aggregate Root)
 *
 * Story 4.3: Create, Edit, Delete Tags
 *
 * Represents a content tag for categorization and filtering.
 * Tags are lightweight metadata that can be attached to content.
 *
 * Business Rules:
 * - slug must be unique per tenant
 * - slug is auto-generated from name (kebab-case)
 * - Cannot modify slug after creation (immutable)
 * - Color must be valid hex format if provided
 * - Category must be one of: GENERAL, EMERGENCY, SERVICES, ANNOUNCEMENTS
 * - Synonyms must be 1-255 characters each
 * - usageCount cannot be negative and is read-only (managed by recordUsage())
 * - Cannot delete tags with usageCount > 0 without force flag
 *
 * Domain Events:
 * - TagCreatedEvent
 * - TagUpdatedEvent
 * - TagDeletedEvent
 * - TagUsedEvent
 */
export class Tag extends AggregateRoot {
  private _tagId: TagId;
  private _props: TagProps;
  private _isDeleted: boolean = false;
  private _deletedAt: Date | null = null;
  private _deletedBy: string | null = null;
  private _createdBy: string;
  private _updatedBy: string | null = null;

  private constructor(
    id: TagId,
    version: number,
    props: TagProps,
    createdBy: string,
    createdAt?: Date,
    updatedAt?: Date,
    isDeleted?: boolean,
    deletedAt?: Date | null,
    deletedBy?: string | null,
    updatedBy?: string | null,
  ) {
    super(id.value, version, createdAt, updatedAt);
    this._tagId = id;
    this._props = props;
    this._createdBy = createdBy;
    this._isDeleted = isDeleted || false;
    this._deletedAt = deletedAt || null;
    this._deletedBy = deletedBy || null;
    this._updatedBy = updatedBy || null;
  }

  // Getters
  get name(): string {
    return this._props.name;
  }

  get slug(): string {
    return this._props.slug;
  }

  get description(): string | undefined {
    return this._props.description;
  }

  get color(): string | undefined {
    return this._props.color;
  }

  get isActive(): boolean {
    return this._props.isActive;
  }

  get tenantId(): string {
    return this._props.tenantId;
  }

  get category(): TagCategory {
    return this._props.category;
  }

  get synonyms(): string[] {
    return this._props.synonyms;
  }

  get usageCount(): number {
    return this._props.usageCount;
  }

  get metadata(): Record<string, unknown> | undefined {
    return this._props.metadata;
  }

  get isDeleted(): boolean {
    return this._isDeleted;
  }

  get deletedAt(): Date | null {
    return this._deletedAt;
  }

  get deletedBy(): string | null {
    return this._deletedBy;
  }

  get createdBy(): string {
    return this._createdBy;
  }

  get updatedBy(): string | null {
    return this._updatedBy;
  }

  /**
   * Get TagId Value Object
   */
  get tagId(): TagId {
    return this._tagId;
  }

  // --- Helper Methods ---

  /**
   * Generate slug from name
   * Converts to lowercase and replaces spaces/special chars with hyphens
   */
  private static generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Validate color format (hex code)
   */
  private static validateColor(color: string): void {
    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (!hexColorRegex.test(color)) {
      throw new DomainException(
        'Color must be a valid hex code (e.g., #FF0000)',
      );
    }
  }

  /**
   * Validate category enum
   */
  private static validateCategory(category: string): void {
    if (!Object.values(TagCategory).includes(category as TagCategory)) {
      throw new DomainException(
        `Category must be one of: ${Object.values(TagCategory).join(', ')}`,
      );
    }
  }

  /**
   * Validate synonyms array
   */
  private static validateSynonyms(synonyms: string[]): void {
    for (const synonym of synonyms) {
      if (!synonym || synonym.trim().length === 0) {
        throw new DomainException('Synonym cannot be empty');
      }
      if (synonym.length > 255) {
        throw new DomainException('Synonym must be 255 characters or less');
      }
    }
  }

  /**
   * Ensure entity is not deleted before modifications
   * Guards against modifying deleted entities
   */
  private ensureNotDeleted(): void {
    if (this._isDeleted) {
      throw new DomainException('Cannot modify deleted tag');
    }
  }

  /**
   * Factory method to create a new tag
   *
   * @param id Tag ID (generated by handler)
   * @param props Tag properties
   * @param createdBy User ID who created this tag
   * @param metadata Optional event metadata
   * @returns New Tag instance
   */
  public static create(
    id: TagId,
    props: TagProps,
    createdBy: string,
    metadata?: IEventMetadata,
  ): Tag {
    // Validation
    if (!props.name || props.name.trim().length === 0) {
      throw new DomainException('Tag name is required');
    }

    if (props.name.length > 100) {
      throw new DomainException('Tag name must be 100 characters or less');
    }

    if (props.color) {
      Tag.validateColor(props.color);
    }

    // Validate category
    Tag.validateCategory(props.category);

    // Validate synonyms
    if (props.synonyms && props.synonyms.length > 0) {
      Tag.validateSynonyms(props.synonyms);
    }

    // Validate usage count
    if (props.usageCount < 0) {
      throw new DomainException('Usage count cannot be negative');
    }

    // Auto-generate slug from name
    const slug = Tag.generateSlug(props.name);
    if (!slug || slug.length === 0) {
      throw new DomainException('Tag name must contain valid characters');
    }

    const now = new Date();
    const tag = new Tag(
      id,
      0,
      { ...props, slug },
      createdBy,
      now,
      now,
    );

    // Emit domain event
    tag.addDomainEvent(
      new TagCreatedEvent(
        tag.id,
        {
          id: tag.id,
          tenantId: props.tenantId,
          name: props.name,
          slug: slug,
          description: props.description ?? null,
          color: props.color ?? null,
          category: props.category,
          synonyms: props.synonyms,
          isActive: props.isActive,
          usageCount: props.usageCount,
          metadata: props.metadata ?? null,
          createdBy,
        },
        metadata,
      ),
    );

    return tag;
  }

  /**
   * Factory method to reconstitute a tag from database
   *
   * @param props Tag properties including id and timestamps
   * @returns Tag instance
   */
  public static reconstitute(props: TagDbProps): Tag {
    return new Tag(
      new TagId(props.id),
      props.version,
      {
        name: props.name,
        slug: props.slug,
        description: props.description,
        color: props.color,
        category: props.category,
        synonyms: props.synonyms,
        isActive: props.isActive,
        usageCount: props.usageCount,
        metadata: props.metadata,
        tenantId: props.tenantId,
      },
      props.createdBy,
      props.createdAt,
      props.updatedAt,
      props.isDeleted,
      props.deletedAt,
      props.deletedBy,
      props.updatedBy,
    );
  }

  /**
   * Update tag fields
   *
   * Business Rules:
   * - slug and tenantId cannot be changed
   * - All other fields are optional
   *
   * @param updates Partial tag properties to update
   * @param updatedBy User ID who updated this tag
   * @param metadata Optional event metadata
   */
  public update(
    updates: Partial<Omit<TagProps, 'slug' | 'tenantId' | 'usageCount'>>,
    updatedBy: string,
    metadata?: IEventMetadata,
  ): void {
    this.ensureNotDeleted();

    // Validation
    if (updates.name !== undefined && updates.name.trim().length === 0) {
      throw new DomainException('Tag name cannot be empty');
    }

    if (updates.name !== undefined && updates.name.length > 100) {
      throw new DomainException('Tag name must be 100 characters or less');
    }

    if (updates.color !== undefined && updates.color) {
      Tag.validateColor(updates.color);
    }

    if (updates.category !== undefined) {
      Tag.validateCategory(updates.category);
    }

    if (updates.synonyms !== undefined && updates.synonyms.length > 0) {
      Tag.validateSynonyms(updates.synonyms);
    }

    // Apply updates
    if (updates.name !== undefined) {
      this._props.name = updates.name;
    }
    if (updates.description !== undefined) {
      this._props.description = updates.description;
    }
    if (updates.color !== undefined) {
      this._props.color = updates.color;
    }
    if (updates.category !== undefined) {
      this._props.category = updates.category;
    }
    if (updates.synonyms !== undefined) {
      this._props.synonyms = updates.synonyms;
    }
    if (updates.isActive !== undefined) {
      this._props.isActive = updates.isActive;
    }
    if (updates.metadata !== undefined) {
      this._props.metadata = updates.metadata;
    }

    // Update timestamp, audit, and version
    this._updatedBy = updatedBy;
    this.markAsModified();

    // Emit domain event
    this.addDomainEvent(
      new TagUpdatedEvent(
        this.id,
        {
          id: this.id,
          tenantId: this.tenantId,
          name: updates.name ?? null,
          description: updates.description ?? null,
          color: updates.color ?? null,
          category: updates.category ?? null,
          synonyms: updates.synonyms ?? null,
          isActive: updates.isActive ?? null,
          metadata: updates.metadata ?? null,
          updatedBy,
        },
        metadata,
      ),
    );
  }

  /**
   * Activate the tag
   *
   * @param updatedBy User ID who activated this tag
   * @param metadata Optional event metadata
   */
  public activate(updatedBy: string, metadata?: IEventMetadata): void {
    this.ensureNotDeleted();

    if (this._props.isActive) {
      return; // Already active, no-op
    }

    this._props.isActive = true;
    this._updatedBy = updatedBy;
    this.markAsModified();

    this.addDomainEvent(
      new TagUpdatedEvent(
        this.id,
        {
          id: this.id,
          tenantId: this.tenantId,
          name: null,
          description: null,
          color: null,
          category: null,
          synonyms: null,
          isActive: true,
          metadata: null,
          updatedBy,
        },
        metadata,
      ),
    );
  }

  /**
   * Deactivate the tag
   *
   * @param updatedBy User ID who deactivated this tag
   * @param metadata Optional event metadata
   */
  public deactivate(updatedBy: string, metadata?: IEventMetadata): void {
    this.ensureNotDeleted();

    if (!this._props.isActive) {
      return; // Already inactive, no-op
    }

    this._props.isActive = false;
    this._updatedBy = updatedBy;
    this.markAsModified();

    this.addDomainEvent(
      new TagUpdatedEvent(
        this.id,
        {
          id: this.id,
          tenantId: this.tenantId,
          name: null,
          description: null,
          color: null,
          category: null,
          synonyms: null,
          isActive: false,
          metadata: null,
          updatedBy,
        },
        metadata,
      ),
    );
  }

  /**
   * Mark tag as deleted
   *
   * Business Rules:
   * - Emits TagDeletedEvent before actual deletion
   * - Soft delete only (sets isDeleted = true)
   * - Cannot delete tags with usageCount > 0 without force flag
   *
   * @param deletedBy User ID who deleted this tag
   * @param force Force delete even if tag is in use
   * @param metadata Optional event metadata
   */
  public markAsDeleted(
    deletedBy: string,
    force: boolean = false,
    metadata?: IEventMetadata,
  ): void {
    // Check usage count before deletion
    if (!force && this._props.usageCount > 0) {
      throw new DomainException(
        `Cannot delete tag with usage count ${this._props.usageCount}. Use force flag to override.`,
      );
    }

    this._isDeleted = true;
    this._deletedAt = new Date();
    this._deletedBy = deletedBy;
    this.updatedAt = new Date();

    this.addDomainEvent(
      new TagDeletedEvent(
        this.id,
        {
          id: this.id,
          tenantId: this.tenantId,
          slug: this.slug,
          usageCount: this._props.usageCount,
          deletedBy,
        },
        metadata,
      ),
    );
  }

  /**
   * Record usage of this tag in content
   *
   * Business Rules:
   * - Increments usage counter
   * - Emits TagUsedEvent for analytics
   *
   * @param contentId ID of content using this tag
   * @param metadata Optional event metadata
   */
  public recordUsage(contentId: string, metadata?: IEventMetadata): void {
    this.ensureNotDeleted();

    this._props.usageCount += 1;
    this.markAsModified();

    this.addDomainEvent(
      new TagUsedEvent(
        this.id,
        {
          id: this.id,
          tenantId: this.tenantId,
          contentId,
          usageCount: this._props.usageCount,
        },
        metadata,
      ),
    );
  }
}
