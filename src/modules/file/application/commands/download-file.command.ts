import { ICommand } from '@core/application';

export class DownloadFileCommand implements ICommand {
  constructor(
    public readonly fileId: string,
    public readonly tenantId: string,
  ) {
    if (!fileId || fileId.trim().length === 0) {
      throw new Error('File ID is required');
    }
    if (!tenantId || tenantId.trim().length === 0) {
      throw new Error('Tenant ID is required');
    }
  }
}
