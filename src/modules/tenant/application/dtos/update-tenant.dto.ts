import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  IsUrl,
  Matches,
  IsObject,
  ValidateNested,
} from "class-validator";
import { TenantStatusEnum } from "../../domain/value-objects";
import { Type } from "class-transformer";

class BrandingConfigDto {
  @IsOptional()
  @IsString()
  @IsUrl({}, { message: "Logo must be a valid URL" })
  logo?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: "Primary color must be a valid hex color code (e.g., #FF5733)",
  })
  primaryColor?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: "Secondary color must be a valid hex color code (e.g., #C70039)",
  })
  secondaryColor?: string;
}

class LimitsDto {
  @IsOptional()
  @IsInt({ message: "Max users must be an integer" })
  @Min(1, { message: "Max users must be at least 1" })
  maxUsers?: number;

  @IsOptional()
  @IsInt({ message: "Max content must be an integer" })
  @Min(1, { message: "Max content must be at least 1" })
  maxContent?: number;

  @IsOptional()
  @IsInt({ message: "Max storage must be an integer" })
  @Min(1, { message: "Max storage must be at least 1" })
  maxStorage?: number;
}

export class UpdateTenantDto {
  @IsOptional()
  @IsString({ message: "Name must be a string" })
  @Matches(/^\S.*\S$/, { message: "Name cannot be empty or whitespace only" })
  name?: string;

  @IsOptional()
  @IsEnum(TenantStatusEnum, {
    message: "Status must be ACTIVE, SUSPENDED, or DELETED",
  })
  status?: string;

  @IsOptional()
  @ValidateNested({ each: false })
  @Type(() => BrandingConfigDto)
  brandingConfig?: BrandingConfigDto;

  @IsOptional()
  @ValidateNested({ each: false })
  @Type(() => LimitsDto)
  limits?: LimitsDto;

  @IsOptional()
  @IsString({ message: "Reason must be a string" })
  reason?: string;
}

export interface UpdateTenantResponse {
  id: string;
  tenantId: string;
  name: string;
  status: string;
  brandingConfig: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
    [key: string]: any;
  } | null;
  limits: {
    maxUsers?: number;
    maxContent?: number;
    maxStorage?: number;
    [key: string]: any;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}
