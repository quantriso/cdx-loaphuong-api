import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: [
    './src/modules/**/infrastructure/persistence/drizzle/schema/*.ts',
    './src/libs/shared/database/outbox/drizzle/schema/outbox.schema.ts',
  ],
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5434/cdx_test',
  },
});
