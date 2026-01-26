import {
  IsEnum,
  IsOptional,
  IsInt,
  IsString,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { TenantStatus } from '../../domain/value-objects';

export class ListTenantsQueryDto {
  @IsOptional()
  @IsEnum(TenantStatus, {
    message: 'Status must be either ACTIVE or INACTIVE',
  })
  status?: TenantStatus;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  limit?: number = 20;

  @IsOptional()
  @IsString({ message: 'SortBy must be a string' })
  @IsIn(['createdAt', 'updatedAt', 'name', 'tenantId'], {
    message: 'SortBy must be one of: createdAt, updatedAt, name, tenantId',
  })
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsEnum(['ASC', 'DESC'], {
    message: 'SortOrder must be either ASC or DESC',
  })
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
