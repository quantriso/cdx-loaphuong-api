import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: [
    './src/modules/**/infrastructure/persistence/drizzle/schema/*.ts',
    './src/libs/shared/database/outbox/drizzle/schema/outbox.schema.ts',
  ],
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'cdx_loaphuong',
    ssl: false,
  },
});
