import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const clase = await prisma.clase.upsert({ where: { nombre: 'Optimist Timoneles' }, update: {}, create: { nombre: 'Optimist Timoneles' } });
  const club = await prisma.club.upsert({ where: { nombre: 'YCA' }, update: {}, create: { nombre: 'YCA', ciudad: 'Buenos Aires' } });
  const camp = await prisma.campeonato.create({
    data: { nombre: 'Semana de Buenos Aires', anio: 2023, claseId: clase.id, sedeId: club.id, estado: 'PUBLICADO', descartes: 1 }
  });
  console.log('Campeonato:', camp.id, 'Clase:', clase.id);
}
main().finally(() => prisma.$disconnect());
