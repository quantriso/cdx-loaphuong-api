import { AggregateRoot, IEventMetadata, DomainException } from '@core/domain';
import {
  ContentCreatedEvent,
  ContentUpdatedEvent,
  ContentSubmittedForApprovalEvent,
  ContentApprovedEvent,
} from '../events';
import { ContentStatus, ContentType, ContentPriority } from '../value-objects';

/**
 * Content Properties Interface
 */
export interface ContentProps {
  tenantId: string;
  authorId: string;
  title: string;
  content: string;
  excerpt: string | null;
  type: ContentType;
  status: ContentStatus;
  priority: ContentPriority;
  categoryId: string | null;
  tags: string[];
  featuredImage: string | null;
}

/**
 * Content Aggregate Root
 *
 * Represents content in the system with complete lifecycle management.
 * Follows DDD Aggregate pattern with encapsulated state and business logic.
 *
 * Story 3.1: Create Content Draft
 * - Editor creates content with title, rich text, excerpt, type, category, tags
 * - Content starts in DRAFT status
 * - Validation enforced: title ≤200, content ≤10000, excerpt ≤500
 */
export class Content extends AggregateRoot {
  private _props: ContentProps;

  private constructor(
    id: string,
    props: ContentProps,
    version: number = 0,
    createdAt: Date = new Date(),
    updatedAt: Date = new Date(),
  ) {
    super(id, version, createdAt, updatedAt);
    this._props = props;
  }

  // --- Factory Methods ---

  /**
   * Create new Content in DRAFT status
   *
   * Story 3.1: Create Content Draft
   */
  static create(
    params: {
      id: string;
      tenantId: string;
      authorId: string;
      title: string;
      content: string;
      excerpt?: string | null;
      type: ContentType;
      priority?: ContentPriority;
      categoryId?: string | null;
      tags?: string[];
      featuredImage?: string | null;
    },
    metadata?: IEventMetadata,
  ): Content {
    // Validation
    Content.validateTitle(params.title);
    Content.validateContent(params.content);
    if (params.excerpt) {
      Content.validateExcerpt(params.excerpt);
    }

    const now = new Date();
    const content = new Content(
      params.id,
      {
        tenantId: params.tenantId,
        authorId: params.authorId,
        title: params.title.trim(),
        content: params.content.trim(),
        excerpt: params.excerpt?.trim() || null,
        type: params.type,
        status: ContentStatus.draft(), // Always start as DRAFT
        priority: params.priority || ContentPriority.medium(),
        categoryId: params.categoryId || null,
        tags: params.tags || [],
        featuredImage: params.featuredImage || null,
      },
      0,
      now,
      now,
    );

    // Emit Domain Event
    content.addDomainEvent(
      new ContentCreatedEvent(
        content.id,
        {
          id: content.id,
          tenantId: content.tenantId,
          authorId: content.authorId,
          title: content.title,
          type: content.type.toString(),
          status: content.status.toString(),
        },
        metadata,
      ),
    );

    return content;
  }

  /**
   * Reconstitute Content from database
   * Does NOT emit events
   */
  static reconstitute(params: {
    id: string;
    tenantId: string;
    authorId: string;
    title: string;
    content: string;
    excerpt: string | null;
    type: ContentType;
    status: ContentStatus;
    priority: ContentPriority;
    categoryId: string | null;
    tags: string[];
    featuredImage: string | null;
    version: number;
    createdAt: Date;
    updatedAt: Date;
  }): Content {
    return new Content(
      params.id,
      {
        tenantId: params.tenantId,
        authorId: params.authorId,
        title: params.title,
        content: params.content,
        excerpt: params.excerpt,
        type: params.type,
        status: params.status,
        priority: params.priority,
        categoryId: params.categoryId,
        tags: params.tags,
        featuredImage: params.featuredImage,
      },
      params.version,
      params.createdAt,
      params.updatedAt,
    );
  }

  // --- Getters ---

  get tenantId(): string {
    return this._props.tenantId;
  }

  get authorId(): string {
    return this._props.authorId;
  }

  get title(): string {
    return this._props.title;
  }

  get content(): string {
    return this._props.content;
  }

  get excerpt(): string | null {
    return this._props.excerpt;
  }

  get type(): ContentType {
    return this._props.type;
  }

  get status(): ContentStatus {
    return this._props.status;
  }

  get priority(): ContentPriority {
    return this._props.priority;
  }

  get categoryId(): string | null {
    return this._props.categoryId;
  }

  get tags(): string[] {
    return [...this._props.tags]; // Return copy to prevent mutation
  }

  get featuredImage(): string | null {
    return this._props.featuredImage;
  }

  // --- Business Methods ---

  /**
   * Check if content can be edited
   * Story 3.1: Only DRAFT content can be edited by author
   */
  canEdit(): boolean {
    return this._props.status.isDraft();
  }

  /**
   * Check if content is rejected
   * Story 3.2: REJECTED content can be edited and reset to DRAFT
   */
  isRejected(): boolean {
    return this._props.status.isRejected();
  }

  /**
   * Update content fields
   * Story 3.2: Update title, content, and excerpt
   *
   * @param title New title
   * @param content New content body
   * @param excerpt New excerpt (optional)
   * @param metadata Event metadata
   */
  updateContent(
    title: string,
    content: string,
    excerpt: string | null,
    metadata?: IEventMetadata,
  ): void {
    // Validate
    Content.validateTitle(title);
    Content.validateContent(content);
    if (excerpt) {
      Content.validateExcerpt(excerpt);
    }

    const changedFields: string[] = [];
    const beforeState: Record<string, unknown> = {};
    const afterState: Record<string, unknown> = {};

    if (this._props.title !== title.trim()) {
      changedFields.push('title');
      beforeState.title = this._props.title;
      afterState.title = title.trim();
      this._props.title = title.trim();
    }

    if (this._props.content !== content.trim()) {
      changedFields.push('content');
      beforeState.content = this._props.content;
      afterState.content = content.trim();
      this._props.content = content.trim();
    }

    const trimmedExcerpt = excerpt?.trim() || null;
    if (this._props.excerpt !== trimmedExcerpt) {
      changedFields.push('excerpt');
      beforeState.excerpt = this._props.excerpt;
      afterState.excerpt = trimmedExcerpt;
      this._props.excerpt = trimmedExcerpt;
    }

    // Only emit event if something changed
    if (changedFields.length > 0) {
      this.addDomainEvent(
        new ContentUpdatedEvent(
          this.id,
          {
            tenantId: this.tenantId,
            contentId: this.id,
            authorId: this.authorId,
            changedBy: this.authorId,
            changedAt: new Date(),
            changedFields,
            beforeState,
            afterState,
            title: this._props.title,
            content: this._props.content,
            excerpt: this._props.excerpt,
            type: this._props.type.toString(),
            priority: this._props.priority.toString(),
            categoryId: this._props.categoryId,
            tags: [...this._props.tags],
          },
          metadata,
        ),
      );
    }
  }

  /**
   * Edit rejected content and reset status to DRAFT
   * Story 3.2: Allows authors to make changes after rejection
   *
   * @param changedBy User ID who is editing
   * @param metadata Event metadata
   */
  editRejectedContent(changedBy: string, metadata?: IEventMetadata): void {
    if (!this.isRejected()) {
      throw new DomainException(
        'Can only edit content that is in REJECTED status',
      );
    }

    const previousStatus = this._props.status.toString();

    // Reset status to DRAFT
    this._props.status = ContentStatus.draft();

    // Emit ContentUpdatedEvent
    this.addDomainEvent(
      new ContentUpdatedEvent(
        this.id,
        {
          tenantId: this.tenantId,
          contentId: this.id,
          authorId: this.authorId,
          changedBy,
          changedAt: new Date(),
          changedFields: ['status'],
          beforeState: {
            status: previousStatus,
          },
          afterState: {
            status: this._props.status.toString(),
          },
          previousStatus,
          newStatus: this._props.status.toString(),
          title: this._props.title,
          content: this._props.content,
          excerpt: this._props.excerpt,
          type: this._props.type.toString(),
          priority: this._props.priority.toString(),
          categoryId: this._props.categoryId,
          tags: [...this._props.tags],
        },
        metadata,
      ),
    );
  }

  /**
   * Set category
   * Story 3.2: Update content category
   *
   * @param categoryId Category ID (null to remove)
   */
  setCategory(categoryId: string | null): void {
    if (!this.canEdit()) {
      throw new DomainException('Cannot change category of non-draft content');
    }
    this._props.categoryId = categoryId;
  }

  /**
   * Set featured image
   * Story 3.2: Update featured image URL
   *
   * @param imageUrl Image URL (null to remove)
   */
  setFeaturedImage(imageUrl: string | null): void {
    if (!this.canEdit()) {
      throw new DomainException(
        'Cannot change featured image of non-draft content',
      );
    }
    this._props.featuredImage = imageUrl;
  }

  /**
   * Add tag
   * Story 3.2: Add a tag to content
   *
   * @param tag Tag to add
   */
  addTag(tag: string): void {
    if (!this.canEdit()) {
      throw new DomainException('Cannot add tags to non-draft content');
    }
    const normalizedTag = tag.trim().toLowerCase();
    if (!this._props.tags.includes(normalizedTag)) {
      this._props.tags.push(normalizedTag);
    }
  }

  /**
   * Remove tag
   * Story 3.2: Remove a tag from content
   *
   * @param tag Tag to remove
   */
  removeTag(tag: string): void {
    if (!this.canEdit()) {
      throw new DomainException('Cannot remove tags from non-draft content');
    }
    const normalizedTag = tag.trim().toLowerCase();
    const index = this._props.tags.indexOf(normalizedTag);
    if (index > -1) {
      this._props.tags.splice(index, 1);
    }
  }

  /**
   * Finalize metadata changes and emit ContentUpdatedEvent
   * Story 3.2: Called after metadata changes to emit event and increment version
   */
  finalizeMetadataChanges(changedBy: string, changedFields: string[]): void {
    if (changedFields.length === 0) return;

    this.addDomainEvent(
      new ContentUpdatedEvent(this.id, {
        tenantId: this.tenantId,
        contentId: this.id,
        authorId: this.authorId,
        changedBy,
        changedAt: new Date(),
        changedFields,
        title: this._props.title,
        content: this._props.content,
        excerpt: this._props.excerpt,
        type: this._props.type.toString(),
        priority: this._props.priority.toString(),
        categoryId: this._props.categoryId,
        tags: [...this._props.tags],
      }),
    );
  }

  /**
   * Check if content can be submitted for approval
   * Story 3.3: Only DRAFT content can be submitted
   */
  canSubmit(): boolean {
    return this._props.status.isDraft();
  }

  /**
   * Submit content for approval
   * Story 3.3: Transition DRAFT → PENDING
   *
   * Business Rules:
   * - Only DRAFT content can be submitted
   * - Status must transition validly (enforced by ContentStatus VO)
   * - Emits ContentSubmittedForApprovalEvent
   *
   * @param metadata Event metadata
   * @throws DomainException if content is not in DRAFT status
   */
  submitForApproval(metadata?: IEventMetadata): void {
    if (!this.canSubmit()) {
      throw new DomainException(
        `Cannot submit content for approval. Current status: ${this._props.status.toString()}`,
      );
    }

    const previousStatus = this._props.status.toString();
    const newStatus = ContentStatus.pending();

    // Validate transition (will throw if invalid)
    if (!this._props.status.canTransitionTo(newStatus)) {
      throw new DomainException(
        `Invalid status transition from ${previousStatus} to ${newStatus.toString()}`,
      );
    }

    // Update status
    this._props.status = newStatus;

    // Emit domain event
    this.addDomainEvent(
      new ContentSubmittedForApprovalEvent(
        this.id,
        {
          tenantId: this.tenantId,
          contentId: this.id,
          authorId: this.authorId,
          title: this._props.title,
          content: this._props.content,
          previousStatus,
          newStatus: newStatus.toString(),
          type: this._props.type.toString(),
          priority: this._props.priority.toString(),
          categoryId: this._props.categoryId,
          tags: [...this._props.tags],
          submittedAt: new Date(),
        },
        metadata,
      ),
    );
  }

  /**
   * Approve pending content
   * Story 3.4: Transition PENDING → APPROVED
   *
   * Business Rules:
   * - Only PENDING content can be approved
   * - Status must transition validly (enforced by ContentStatus VO)
   * - Emits ContentApprovedEvent
   *
   * @param approvedBy Admin user ID who approved the content
   * @param approvalReason Optional reason for approval
   * @param metadata Event metadata
   * @throws DomainException if content is not in PENDING status
   */
  approve(
    approvedBy: string,
    approvalReason?: string,
    metadata?: IEventMetadata,
  ): void {
    if (!this._props.status.isPending()) {
      throw new DomainException(
        `Cannot approve content. Current status: ${this._props.status.toString()}. Only PENDING content can be approved.`,
      );
    }

    const previousStatus = this._props.status.toString();
    const newStatus = ContentStatus.approved();

    // Validate transition (will throw if invalid)
    if (!this._props.status.canTransitionTo(newStatus)) {
      throw new DomainException(
        `Invalid status transition from ${previousStatus} to ${newStatus.toString()}`,
      );
    }

    // Update status
    this._props.status = newStatus;

    // Emit domain event
    this.addDomainEvent(
      new ContentApprovedEvent(
        this.id,
        {
          tenantId: this.tenantId,
          authorId: this.authorId,
          approvedBy,
          approvedAt: new Date(),
          previousStatus,
          newStatus: newStatus.toString(),
          title: this._props.title,
          type: this._props.type.toString(),
          priority: this._props.priority.toString(),
          categoryId: this._props.categoryId,
          tags: [...this._props.tags],
          approvalReason,
        },
        metadata,
      ),
    );
  }

  // --- Validation Methods ---

  private static validateTitle(title: string): void {
    if (!title || title.trim().length === 0) {
      throw new DomainException('Content title is required');
    }
    if (title.length > 200) {
      throw new DomainException('Content title cannot exceed 200 characters');
    }
  }

  private static validateContent(content: string): void {
    if (!content || content.trim().length === 0) {
      throw new DomainException('Content body is required');
    }
    if (content.length > 10000) {
      throw new DomainException('Content body cannot exceed 10000 characters');
    }
  }

  private static validateExcerpt(excerpt: string): void {
    if (excerpt.length > 500) {
      throw new DomainException('Content excerpt cannot exceed 500 characters');
    }
  }
}
