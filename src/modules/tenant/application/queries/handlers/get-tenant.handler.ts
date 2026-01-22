import { QueryHandler, IQueryHandler } from "@nestjs/cqrs";
import { Inject, NotFoundException } from "@nestjs/common";
import { GetTenantQuery } from "../get-tenant.query";
import type {
  ITenantReadDao,
  TenantReadDto,
} from "../ports/tenant-read-dao.interface";
import { TENANT_READ_DAO_TOKEN} from "../../../constants/tokens";

@QueryHandler(GetTenantQuery)
export class GetTenantHandler
  implements IQueryHandler<GetTenantQuery, TenantReadDto>
{
  constructor(
    @Inject(TENANT_READ_DAO_TOKEN)
    private readonly tenantReadDao: ITenantReadDao,
  ) {}

  async execute(query: GetTenantQuery): Promise<TenantReadDto> {
    const tenant = await this.tenantReadDao.findById(query.id);

    if (!tenant) {
      throw new NotFoundException(`Tenant with id ${query.id} not found`);
    }

    return tenant;
  }
}
