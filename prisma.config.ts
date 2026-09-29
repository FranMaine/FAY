import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7 sacó la URL de la conexión del schema.prisma y el auto-cargado
// del .env: ahora se declara acá (la usan `prisma db push`, `generate`,
// etc.). La conexión en runtime va por el driver adapter de src/lib/db.ts.
//
// OJO: el helper `env()` de 'prisma/config' rompe con error si la
// variable no está seteada -eso tira abajo hasta `prisma generate`
// (corre como postinstall en cada `pnpm install`), que no necesita
// conectarse a nada real. Rompió el install de CI: ese paso corre antes
// de que el job exporte DATABASE_URL (eso pasa recién en el step de
// build). `process.env.DATABASE_URL` sin el helper deja pasar `generate`
// sin URL; los comandos que sí necesitan una conexión real (`db push`,
// `studio`, runtime) van a fallar igual cuando realmente intenten
// conectarse, con o sin esta validación adelantada.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { seed: "tsx prisma/seed.ts" },
  datasource: { url: process.env.DATABASE_URL },
});
