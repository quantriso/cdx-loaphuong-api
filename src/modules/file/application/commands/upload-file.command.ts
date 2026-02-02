import { ICommand } from '@core/application';

export interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  fieldname?: string;
  encoding?: string;
  filename?: string;
  path?: string;
}

export class UploadFileCommand implements ICommand {
  constructor(
    public readonly file: UploadedFile,
    public readonly tenantId: string,
    public readonly uploadedBy: string,
    public readonly storageKey?: string,
  ) {
    if (!file) {
      throw new Error('File is required');
    }
    if (!tenantId || tenantId.trim().length === 0) {
      throw new Error('Tenant ID is required');
    }
    if (!uploadedBy || uploadedBy.trim().length === 0) {
      throw new Error('Uploaded by is required');
    }
  }
}
