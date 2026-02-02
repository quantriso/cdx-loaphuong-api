import { ICommand } from '@core/application';

export interface ImageProcessingOptions {
  width?: number;
  height?: number;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

export class ProcessFileCommand implements ICommand {
  constructor(
    public readonly fileId: string,
    public readonly processedBy: string,
    public readonly tenantId: string,
    public readonly options?: ImageProcessingOptions,
  ) {
    if (!fileId || fileId.trim().length === 0) {
      throw new Error('File ID is required');
    }
    if (!processedBy || processedBy.trim().length === 0) {
      throw new Error('Processed by is required');
    }
    if (!tenantId || tenantId.trim().length === 0) {
      throw new Error('Tenant ID is required');
    }
  }
}
