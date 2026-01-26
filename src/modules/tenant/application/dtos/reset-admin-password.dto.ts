import { z } from 'zod';

// Reset admin password DTO schema
export const resetAdminPasswordSchema = z.object({
  reason: z
    .string()
    .min(5, 'Reason must be at least 5 characters')
    .max(500, 'Reason must not exceed 500 characters'),
});

export type ResetAdminPasswordDto = z.infer<typeof resetAdminPasswordSchema>;

// Reset admin password response schema
export const resetAdminPasswordResponseSchema = z.object({
  tenantId: z.string(),
  adminEmail: z.string(),
  passwordReset: z.boolean(),
  emailSent: z.boolean(),
});

export type ResetAdminPasswordResponse = z.infer<
  typeof resetAdminPasswordResponseSchema
>;
