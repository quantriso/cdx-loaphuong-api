import { ICommand } from '@core/application';

export class GetDownloadUrlCommand implements ICommand {
  constructor(
    public readonly fileId: string,
    public readonly tenantId: string,
    public readonly version:
      | 'original'
      | 'processed'
      | 'thumbnail' = 'original',
    public readonly userId?: string,
    public readonly contentId?: string,
    public readonly ipAddress?: string,
    public readonly userAgent?: string,
  ) {
    if (!fileId || fileId.trim().length === 0) {
      throw new Error('File ID is required');
    }
    if (!tenantId || tenantId.trim().length === 0) {
      throw new Error('Tenant ID is required');
    }
  }
}
