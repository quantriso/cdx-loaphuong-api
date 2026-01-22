import { ICommand } from "@core/application";

export class SoftDeleteTenantCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly reason: string,
    public readonly forceDelete?: boolean,
    public readonly userId?: string
  ) {}
}
