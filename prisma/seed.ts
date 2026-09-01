import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // 1. Create Clase
  const claseOptimist = await prisma.clase.upsert({
    where: { nombre: 'Optimist' },
    update: {},
    create: { nombre: 'Optimist' },
  });

  // 2. Create Clubs
  const clubsData = [
    { nombre: 'YCA - Yacht Club Argentino', ciudad: 'Buenos Aires' },
    { nombre: 'CNSI - Club Náutico San Isidro', ciudad: 'San Isidro' },
    { nombre: 'CNMP - Club Náutico Mar del Plata', ciudad: 'Mar del Plata' },
  ];

  const clubs = [];
  for (const c of clubsData) {
    const club = await prisma.club.upsert({
      where: { nombre: c.nombre },
      update: {},
      create: c,
    });
    clubs.push(club);
  }

  // 3. Create Regatistas (Sailors)
  const regatistasData = [
    { nombre: 'Juan Pérez', clubId: clubs[0].id },
    { nombre: 'María González', clubId: clubs[1].id },
    { nombre: 'Lucas Rodríguez', clubId: clubs[2].id },
    { nombre: 'Sofía Fernández', clubId: clubs[0].id },
    { nombre: 'Martín López', clubId: clubs[1].id },
    { nombre: 'Valentina Martínez', clubId: clubs[2].id },
    { nombre: 'Joaquín Silva', clubId: clubs[0].id },
    { nombre: 'Camila Gómez', clubId: clubs[1].id },
    { nombre: 'Mateo Sánchez', clubId: clubs[2].id },
    { nombre: 'Florencia Romero', clubId: clubs[0].id },
  ];

  const regatistas = [];
  for (const r of regatistasData) {
    const regatista = await prisma.regatista.create({
      data: r,
    });
    regatistas.push(regatista);
  }

  // 4. Create Campeonatos (Championships)
  const campeonatosData = [
    {
      nombre: 'Campeonato Argentino de Optimist',
      anio: 2023,
      claseId: claseOptimist.id,
      sedeId: clubs[0].id,
      descartes: 1,
      estado: 'PUBLICADO',
    },
    {
      nombre: 'Semana de Buenos Aires',
      anio: 2023,
      claseId: claseOptimist.id,
      sedeId: clubs[0].id,
      descartes: 1,
      estado: 'PUBLICADO',
    },
    {
      nombre: 'Campeonato San Isidro Labrador',
      anio: 2023,
      claseId: claseOptimist.id,
      sedeId: clubs[1].id,
      descartes: 0,
      estado: 'PUBLICADO',
    },
    {
      nombre: 'Semana Internacional del Yachting',
      anio: 2024,
      claseId: claseOptimist.id,
      sedeId: clubs[2].id,
      descartes: 1,
      estado: 'BORRADOR',
    },
  ];

  for (const c of campeonatosData) {
    const campeonato = await prisma.campeonato.create({
      data: {
        ...c,
        estado: c.estado as any,
      },
    });

    // Create Regatas and Resultados for each Championship
    const numRegatas = c.descartes === 1 ? 6 : 4;
    
    for (let r = 1; r <= numRegatas; r++) {
      const regata = await prisma.regata.create({
        data: {
          campeonatoId: campeonato.id,
          numero: r,
        },
      });

      // Generate random but somewhat consistent results
      const shuffledRegatistas = [...regatistas].sort(() => Math.random() - 0.5);
      
      for (let p = 0; p < shuffledRegatistas.length; p++) {
        // Occasionally throw in a DNF
        const isDnf = Math.random() > 0.9;
        
        await prisma.resultado.create({
          data: {
            regataId: regata.id,
            regatistaId: shuffledRegatistas[p].id,
            puesto: isDnf ? shuffledRegatistas.length + 1 : p + 1,
            puntos: isDnf ? shuffledRegatistas.length + 1 : p + 1,
            observacion: isDnf ? 'DNF' : null,
          },
        });
      }
    }
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
