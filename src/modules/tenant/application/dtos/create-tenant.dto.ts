import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { z } from "zod";

class BrandingConfigDto {
  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsString()
  primaryColor?: string;

  @IsOptional()
  @IsString()
  secondaryColor?: string;
}

class LimitsDto {
  @IsOptional()
  maxUsers?: number;

  @IsOptional()
  maxContent?: number;

  @IsOptional()
  maxStorage?: number;
}

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  adminPassword: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => BrandingConfigDto)
  brandingConfig?: BrandingConfigDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LimitsDto)
  limits?: LimitsDto;
}

// Zod schema for validation
export const createTenantSchema = z.object({
  name: z.string().min(1, "Tenant name is required"),
  adminPassword: z.string().min(8, "Admin password must be at least 8 characters"),
  brandingConfig: z
    .object({
      logo: z.string().optional(),
      primaryColor: z.string().optional(),
      secondaryColor: z.string().optional(),
    })
    .optional(),
  limits: z
    .object({
      maxUsers: z.number().optional(),
      maxContent: z.number().optional(),
      maxStorage: z.number().optional(),
    })
    .optional(),
});
