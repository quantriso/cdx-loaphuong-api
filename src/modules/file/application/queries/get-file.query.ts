import { IQuery } from '@core/application';
import { FileDto } from '../dtos/file.dto';

export class GetFileQuery extends IQuery<FileDto> {
  constructor(
    public readonly fileId: string,
    public readonly tenantId: string,
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
