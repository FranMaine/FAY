import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  await prisma.resultado.deleteMany();
  await prisma.regata.deleteMany();
  await prisma.stagingImport.deleteMany();
  await prisma.campeonato.deleteMany();
  await prisma.regatista.deleteMany();
  console.log('Base de datos limpiada de datos ficticios.');
}
main().finally(() => prisma.$disconnect());
