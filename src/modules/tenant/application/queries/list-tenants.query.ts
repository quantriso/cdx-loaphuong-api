import { IQuery } from '@core/application';
import type { ListTenantsResult } from './ports/tenant-read-dao.interface';

export class ListTenantsQuery extends IQuery<ListTenantsResult> {
  constructor(
    public readonly page: number = 1,
    public readonly limit: number = 20,
    public readonly status?: string,
    public readonly sortBy?: 'createdAt' | 'updatedAt' | 'name' | 'status',
    public readonly sortOrder?: 'ASC' | 'DESC',
  ) {
    super();
  }
}
