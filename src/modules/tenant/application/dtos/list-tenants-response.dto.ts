import { Tenant } from '../../domain/entities/tenant.entity';

export interface TenantStatistics {
  userCount: number;
  contentCount: number;
  storageUsage: number;
}

export interface TenantListItem {
  id: string;
  tenantId: string;
  name: string;
  status: string;
  userCount: number;
  contentCount: number;
  storageUsage: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ListTenantsResponse {
  items: TenantListItem[];
  pagination: PaginationMetadata;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T;
  message: string;
}
