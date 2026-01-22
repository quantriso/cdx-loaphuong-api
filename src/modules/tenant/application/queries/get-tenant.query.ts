import { IQuery } from "@core/application";
import type { TenantReadDto } from "./ports/tenant-read-dao.interface";

export class GetTenantQuery extends IQuery<TenantReadDto> {
  constructor(public readonly id: string) {
    super();
  }
}
