import { PrismaClient } from '@prisma/client';

// Borra TODOS los resultados/regatas/campeonatos/regatistas -sin soft
// delete, sin papelera, sin vuelta atrás. Antes no tenía ningún guard: un
// "tsx scripts/clean-db.ts" corrido sin querer (o con el .env equivocado
// apuntando a producción en vez de a una base local de prueba) borraba
// toda la carga real sin pedir ninguna confirmación. Ahora hace falta el
// flag explícito, y de paso muestra contra qué base va a correr para que
// sea imposible no darse cuenta.
const CONFIRMACION = '--confirmo-que-quiero-borrar-todo';

async function main() {
  const url = process.env.DATABASE_URL || '';
  const host = url.match(/@([^/]+)\//)?.[1] || '(no se pudo leer el host de DATABASE_URL)';

  console.log(`Esto va a borrar TODOS los resultados, regatas, campeonatos y regatistas de: ${host}`);

  if (!process.argv.includes(CONFIRMACION)) {
    console.log(`\nNada borrado. Para confirmar, corré:\n  pnpm tsx scripts/clean-db.ts ${CONFIRMACION}`);
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    await prisma.resultado.deleteMany();
    await prisma.regata.deleteMany();
    await prisma.stagingImport.deleteMany();
    await prisma.campeonato.deleteMany();
    await prisma.regatista.deleteMany();
    console.log('Base de datos limpiada de datos ficticios.');
  } finally {
    await prisma.$disconnect();
  }
}

main();
