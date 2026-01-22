import {
  IsString,
  IsOptional,
  IsBoolean,
  MinLength,
  MaxLength,
} from "class-validator";

/**
 * DTO for soft delete tenant request
 */
export class SoftDeleteTenantDto {
  @IsString({ message: "Reason must be a string" })
  @MinLength(10, { message: "Reason must be at least 10 characters" })
  @MaxLength(500, { message: "Reason must not exceed 500 characters" })
  reason: string;

  @IsOptional()
  @IsBoolean({ message: "forceDelete must be a boolean" })
  forceDelete?: boolean;
}

/**
 * Response DTO for soft delete tenant operation
 */
export interface SoftDeleteTenantResponse {
  id: string;
  tenantId: string;
  name: string;
  status: string;
  deletedAt: Date;
  deletedBy: string;
  reason: string;
}
