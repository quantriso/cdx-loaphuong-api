import { ICommand } from "@core/application";
import { BrandingConfig, TenantLimits } from "../../domain/entities/tenant.entity";

export class UpdateTenantCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly name?: string,
    public readonly status?: string,
    public readonly brandingConfig?: BrandingConfig,
    public readonly limits?: TenantLimits,
    public readonly reason?: string,
    public readonly userId?: string
  ) {}
}
