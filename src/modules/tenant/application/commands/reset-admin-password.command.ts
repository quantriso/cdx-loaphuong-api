import { ICommand } from '@core/application';

export class ResetAdminPasswordCommand implements ICommand {
  constructor(
    public readonly tenantId: string,
    public readonly reason?: string,
    public readonly userId?: string,
  ) {}
}
