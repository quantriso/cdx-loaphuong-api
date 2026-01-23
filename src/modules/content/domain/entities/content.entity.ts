import { AggregateRoot, IEventMetadata, DomainException } from "@core/domain";
import { ContentCreatedEvent } from "../events";
import { ContentStatus, ContentType, ContentPriority } from "../value-objects";

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
    updatedAt: Date = new Date()
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
  static create(params: {
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
  }, metadata?: IEventMetadata): Content {
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
      now
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
        metadata
      )
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
      params.updatedAt
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

  // --- Business Methods (Story 3.1) ---

  /**
   * Check if content can be edited
   * Story 3.1: Only DRAFT content can be edited by author
   */
  canEdit(): boolean {
    return this._props.status.isDraft();
  }

  // --- Validation Methods ---

  private static validateTitle(title: string): void {
    if (!title || title.trim().length === 0) {
      throw new DomainException("Content title is required");
    }
    if (title.length > 200) {
      throw new DomainException("Content title cannot exceed 200 characters");
    }
  }

  private static validateContent(content: string): void {
    if (!content || content.trim().length === 0) {
      throw new DomainException("Content body is required");
    }
    if (content.length > 10000) {
      throw new DomainException("Content body cannot exceed 10000 characters");
    }
  }

  private static validateExcerpt(excerpt: string): void {
    if (excerpt.length > 500) {
      throw new DomainException("Content excerpt cannot exceed 500 characters");
    }
  }
}
