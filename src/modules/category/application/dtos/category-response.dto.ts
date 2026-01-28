import { ApiProperty } from '@nestjs/swagger';

/**
 * Category DTO for read operations
 *
 * Used in Query responses (Read Model).
 * Contains only data relevant for client consumption.
 *
 * Story 4.1: Manage Categories
 *
 * Note: 'version' is intentionally excluded as it's an
 * internal implementation detail of the Write Model.
 */
export class CategoryDto {
  @ApiProperty({ description: 'Category ID' })
  id: string;

  @ApiProperty({ description: 'Tenant ID' })
  tenantId: string;

  @ApiProperty({
    description: 'Category value (unique key)',
    example: 'EMERGENCY',
  })
  value: string;

  @ApiProperty({ description: 'Category label', example: 'Emergency Alerts' })
  label: string;

  @ApiProperty({ description: 'Category description', required: false })
  description?: string;

  @ApiProperty({
    description: 'Color code',
    example: '#FF0000',
    required: false,
  })
  color?: string;

  @ApiProperty({ description: 'Icon', example: '🚨', required: false })
  icon?: string;

  @ApiProperty({ description: 'Active status' })
  isActive: boolean;

  @ApiProperty({ description: 'Sort order (lower = higher priority)' })
  sortOrder: number;

  @ApiProperty({
    description: 'Parent category ID',
    required: false,
    nullable: true,
  })
  parentId: string | null;

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
    value: string;
    label: string;
    description: string | null | undefined;
    color: string | null | undefined;
    icon: string | null | undefined;
    isActive: boolean;
    sortOrder: number;
    parentId: string | null;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    updatedBy: string | null | undefined;
  }) {
    this.id = params.id;
    this.tenantId = params.tenantId;
    this.value = params.value;
    this.label = params.label;
    this.description = params.description ?? undefined;
    this.color = params.color ?? undefined;
    this.icon = params.icon ?? undefined;
    this.isActive = params.isActive;
    this.sortOrder = params.sortOrder;
    this.parentId = params.parentId;
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
    value: string;
    label: string;
    description: string | null | undefined;
    color: string | null | undefined;
    icon: string | null | undefined;
    isActive: boolean;
    sortOrder: number;
    parentId: string | null;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    updatedBy: string | null | undefined;
  }): CategoryDto {
    return new CategoryDto(data);
  }
}

// Deprecated: Use CategoryDto instead
export { CategoryDto as CategoryResponseDto };
