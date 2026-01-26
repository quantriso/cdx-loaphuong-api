import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ListTenantsQuery } from '../list-tenants.query';
import type {
  ITenantReadDao,
  ListTenantsResult,
} from '../ports/tenant-read-dao.interface';
import { TENANT_READ_DAO_TOKEN } from '../../../constants/tokens';

@QueryHandler(ListTenantsQuery)
export class ListTenantsHandler implements IQueryHandler<
  ListTenantsQuery,
  ListTenantsResult
> {
  constructor(
    @Inject(TENANT_READ_DAO_TOKEN)
    private readonly tenantReadDao: ITenantReadDao,
  ) {}

  async execute(query: ListTenantsQuery): Promise<ListTenantsResult> {
    const result = await this.tenantReadDao.findMany(
      {
        status: query.status,
        sortBy: query.sortBy || 'createdAt',
        sortOrder: query.sortOrder || 'DESC',
      },
      {
        page: query.page,
        limit: query.limit,
      },
    );

    return result;
  }
}
