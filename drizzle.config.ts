import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// Load .env.local (and the other .env files) the same way Next.js does.
loadEnvConfig(process.cwd());

const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DIRECT_DATABASE_URL / DATABASE_URL is not set: fill in .env.local (see .env.example)",
  );
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Use the direct or session connection (port 5432) for migrations.
  dbCredentials: { url },
});
