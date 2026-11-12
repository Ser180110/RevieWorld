// Applies the SQL migrations in ./drizzle to the database in .env.local
// and prints a clear message when something goes wrong.
import nextEnv from "@next/env";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

nextEnv.loadEnvConfig(process.cwd());

const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("✗ DIRECT_DATABASE_URL is missing: fill in .env.local (see .env.example).");
  process.exit(1);
}
if (url.includes("[YOUR-PASSWORD]") || url.includes("xxxxxxxx")) {
  console.error("✗ .env.local still contains placeholders: replace [YOUR-PASSWORD] / xxxxxxxx.");
  process.exit(1);
}

let host = "?";
try {
  host = new URL(url).host;
} catch {
  console.error("✗ The database URL in .env.local is not a valid URL.");
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {}, connect_timeout: 15 });

try {
  console.log(`Connecting to ${host} ...`);
  await sql`select 1`;
  console.log("Connected. Applying migrations ...");
  await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
  const [{ count }] = await sql`
    select count(*)::int as count from information_schema.tables where table_schema = 'public'`;
  console.log(`✓ Migrations applied. Tables in public: ${count}`);
} catch (error) {
  console.error("✗ Migration failed:");
  console.error("  " + (error?.message ?? error));
  if (error?.code) console.error("  code: " + error.code);
  if (error?.cause?.message) console.error("  cause: " + error.cause.message);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
