import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create a PostgreSQL connection pool
// Works with both standard PostgreSQL and Neon (which uses standard PostgreSQL protocol)
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  // Additional connection options for better compatibility
  ssl: process.env.DATABASE_URL?.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle({ client: pool, schema });
