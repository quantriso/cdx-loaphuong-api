import { ICommand } from "@core/application";
import { BrandingConfig, TenantLimits } from "../../domain/entities/tenant.entity";

export class CreateTenantCommand implements ICommand {
  constructor(
    public readonly name: string,
    public readonly subdomain: string,
    public readonly adminEmail: string,
    public readonly adminPassword: string,
    public readonly brandingConfig?: BrandingConfig | null,
    public readonly limits?: TenantLimits | null,
    public readonly createdBy?: string
  ) {}
}
