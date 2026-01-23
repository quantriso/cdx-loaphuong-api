import { ApiProperty } from "@nestjs/swagger";

/**
 * Content Response DTO
 *
 * Data Transfer Object for returning content data to clients
 */
export class ContentResponseDto {
  @ApiProperty({ description: "Content ID (UUID)", example: "550e8400-e29b-41d4-a716-446655440000" })
  id: string;

  @ApiProperty({ description: "Tenant ID (UUID)", example: "123e4567-e89b-12d3-a456-426614174000" })
  tenantId: string;

  @ApiProperty({ description: "Author ID (UUID)", example: "987fcdeb-51a2-43d7-b987-123456789abc" })
  authorId: string;

  @ApiProperty({ description: "Content title", example: "Introduction to DDD" })
  title: string;

  @ApiProperty({ description: "Content body", example: "Domain-Driven Design is..." })
  content: string;

  @ApiProperty({ description: "Brief excerpt", example: "Learn DDD fundamentals", nullable: true })
  excerpt: string | null;

  @ApiProperty({ description: "Content type", example: "ARTICLE" })
  type: string;

  @ApiProperty({ description: "Content status", example: "DRAFT" })
  status: string;

  @ApiProperty({ description: "Content priority", example: "MEDIUM" })
  priority: string;

  @ApiProperty({ description: "Category ID", example: "550e8400-e29b-41d4-a716-446655440000", nullable: true })
  categoryId: string | null;

  @ApiProperty({ description: "Content tags", example: ["ddd", "architecture"], type: [String] })
  tags: string[];

  @ApiProperty({ description: "Featured image URL", example: "https://example.com/image.jpg", nullable: true })
  featuredImage: string | null;

  @ApiProperty({ description: "Version number for optimistic locking", example: 1 })
  version: number;

  @ApiProperty({ description: "Creation timestamp", example: "2026-01-23T10:00:00.000Z" })
  createdAt: Date;

  @ApiProperty({ description: "Last update timestamp", example: "2026-01-23T10:30:00.000Z" })
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
