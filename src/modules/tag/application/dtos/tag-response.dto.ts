import { ApiProperty } from '@nestjs/swagger';

/**
 * Tag DTO for read operations
 *
 * Used in Query responses (Read Model).
 * Contains only data relevant for client consumption.
 *
 * Story 4.3: Create, Edit, Delete Tags
 *
 * Note: 'version' is intentionally excluded as it's an
 * internal implementation detail of the Write Model.
 */
export class TagDto {
  @ApiProperty({ description: 'Tag ID' })
  id: string;

  @ApiProperty({ description: 'Tenant ID' })
  tenantId: string;

  @ApiProperty({
    description: 'Tag name',
    example: 'Emergency',
  })
  name: string;

  @ApiProperty({
    description: 'Tag slug (URL-safe identifier)',
    example: 'emergency',
  })
  slug: string;

  @ApiProperty({ description: 'Tag description', required: false })
  description?: string;

  @ApiProperty({
    description: 'Color code',
    example: '#FF0000',
    required: false,
  })
  color?: string;

  @ApiProperty({ description: 'Active status' })
  isActive: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiProperty({ description: 'Created by user ID' })
  createdBy: string;

  @ApiProperty({ description: 'Updated by user ID', required: false })
  updatedBy?: string;

  constructor(params: {
    id: string;
    tenantId: string;
    name: string;
    slug: string;
    description: string | null | undefined;
    color: string | null | undefined;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    updatedBy: string | null | undefined;
  }) {
    this.id = params.id;
    this.tenantId = params.tenantId;
    this.name = params.name;
    this.slug = params.slug;
    this.description = params.description ?? undefined;
    this.color = params.color ?? undefined;
    this.isActive = params.isActive;
    this.createdAt = params.createdAt;
    this.updatedAt = params.updatedAt;
    this.createdBy = params.createdBy;
    this.updatedBy = params.updatedBy ?? undefined;
  }

  /**
   * Factory method to create from raw data
   */
  static fromRaw(data: {
    id: string;
    tenantId: string;
    name: string;
    slug: string;
    description: string | null | undefined;
    color: string | null | undefined;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    updatedBy: string | null | undefined;
  }): TagDto {
    return new TagDto(data);
  }
}

// Deprecated: Use TagDto instead
export { TagDto as TagResponseDto };
