import { IQuery } from '@core/application';

export type FileVersion = 'original' | 'processed' | 'thumbnail';

export class DownloadFileQuery extends IQuery<{
  url: string;
  mimeType: string;
  fileName: string;
}> {
  constructor(
    public readonly fileId: string,
    public readonly tenantId: string,
    public readonly version: FileVersion = 'original',
  ) {
    super();
    if (!fileId || fileId.trim().length === 0) {
      throw new Error('File ID is required');
    }
    if (!tenantId || tenantId.trim().length === 0) {
      throw new Error('Tenant ID is required');
    }
  }
}
