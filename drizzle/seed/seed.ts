import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from 'dotenv';

// Load environment variables
config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/cdx_loaphuong';

async function seed() {
  console.log('🌱 Starting database seed...');

  const client = postgres(connectionString);
  const db = drizzle(client);

  try {
    // Note: Actual table schemas will be created when modules are implemented
    // This is a placeholder for Epic 0 infrastructure setup

    console.log('✅ Seed data structure prepared');
    console.log('📝 Seed data will be populated when Epic 1 (Multi-tenant) is implemented');
    console.log('📝 Default categories will be seeded in Epic 4 (Category Management)');

    console.log('🌱 Database seed completed successfully!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();
