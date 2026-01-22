export class AdminCredentialsDto {
  email: string;
  temporaryPassword: string;
}

export class CreateTenantResponseDto {
  success: boolean;
  data: {
    id: string;
    tenantId: string;
    name: string;
    status: string;
    adminCredentials: AdminCredentialsDto;
    categoriesInitialized: number;
  };
  message: string;
}
