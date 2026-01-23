/**
 * Content Response DTO
 *
 * Data Transfer Object for returning content data to clients
 */
export class ContentResponseDto {
  id: string;
  tenantId: string;
  authorId: string;
  title: string;
  content: string;
  excerpt: string | null;
  type: string;
  status: string;
  priority: string;
  categoryId: string | null;
  tags: string[];
  featuredImage: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(params: {
    id: string;
    tenantId: string;
    authorId: string;
    title: string;
    content: string;
    excerpt: string | null;
    type: string;
    status: string;
    priority: string;
    categoryId: string | null;
    tags: string[];
    featuredImage: string | null;
    version: number;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = params.id;
    this.tenantId = params.tenantId;
    this.authorId = params.authorId;
    this.title = params.title;
    this.content = params.content;
    this.excerpt = params.excerpt;
    this.type = params.type;
    this.status = params.status;
    this.priority = params.priority;
    this.categoryId = params.categoryId;
    this.tags = params.tags;
    this.featuredImage = params.featuredImage;
    this.version = params.version;
    this.createdAt = params.createdAt;
    this.updatedAt = params.updatedAt;
  }
}
