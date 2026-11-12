import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Server-side database client. Uses the Supabase connection pooler
 * (transaction mode), which does not support prepared statements.
 * Note: this connects as the database owner and bypasses Row Level Security;
 * check permissions in code, or use the Supabase client for user-scoped reads.
 */
const globalForDb = globalThis as unknown as { sql?: postgres.Sql };

function connection() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (see .env.example)");
  globalForDb.sql ??= postgres(url, { prepare: false });
  return globalForDb.sql;
}

export const db = () => drizzle(connection(), { schema });
