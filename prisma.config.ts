import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Same default as src/lib/db.ts so a fresh clone installs without a .env.
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  },
});
