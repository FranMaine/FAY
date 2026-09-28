import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7 sacó la URL de la conexión del schema.prisma y el auto-cargado
// del .env: ahora se declara acá (la usan `prisma db push`, `generate`,
// etc.). La conexión en runtime va por el driver adapter de src/lib/db.ts.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { seed: "tsx prisma/seed.ts" },
  datasource: { url: env("DATABASE_URL") },
});
