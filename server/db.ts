import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@shared/schema';

if (!process.env.DATABASE_URL) {
  console.warn("⚠️  DATABASE_URL is not set. Supabase sync will not work until this is configured.");
}

// Disable prefetch as it is not supported for "Transaction" pool mode
const client = postgres(process.env.DATABASE_URL || "postgres://dummy:dummy@localhost:5432/dummy", { prepare: false });
export const db = drizzle(client, { schema });
