import prisma from '@/lib/db';
import { ParseResult } from './csv-parser';
import { splitNombreTripulacion, splitClubPorTripulante } from '@/lib/nombres';

// Corre un lote de promesas con concurrencia limitada, en vez de secuencial
// (demasiado lento) o todas juntas (satura el pool de conexiones de Neon).
async function runWithConcurrency<T>(items: T[], concurrency: number, fn: (item: T) => Promise<void>) {
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const item = items[index++];
      await fn(item);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
}

export async function importCampeonatoResults(campeonatoId: string, parsedData: ParseResult[]) {
  const campeonato = await prisma.campeonato.findUnique({
    where: { id: campeonatoId },
  });

  if (!campeonato) {
    throw new Error("Campeonato no encontrado");
  }

  const totalInscritos = parsedData.length;
  let regatistasNuevos = 0;
  let regatasNuevas = 0;
  let resultadosInsertados = 0;

  // Nota: a propósito NO envolvemos todo esto en un prisma.$transaction().
  // Con importaciones grandes (cientos de regatistas x varias regatas cada
  // uno) una única transacción interactiva mantiene una conexión abierta
  // durante demasiado tiempo; sobre la conexión pooleada de Neon, el pooler
  // la recicla antes de terminar y Prisma tira "Transaction not found".
  // Todas las escrituras de acá abajo son upserts o find-or-create
  // idempotentes, así que es seguro correrlas sueltas: si algo se corta a
  // mitad de camino, reimportar el mismo archivo retoma donde quedó sin
  // duplicar nada.

  // 1. Precargar clubes y regatistas existentes en una sola consulta cada
  // uno, en vez de un findFirst por fila (que con 200+ regatistas eran
  // cientos de round-trips solo para esto).
  const clubesExistentes = await prisma.club.findMany();
  const clubPorNombre = new Map(clubesExistentes.map(c => [c.nombre.toUpperCase(), c]));

  const regatistasExistentes = await prisma.regatista.findMany();
  const regatistaPorNombre = new Map(regatistasExistentes.map(r => [r.nombre.toLowerCase(), r]));

  // 2. Resolver (o crear) el Club y el Regatista de cada fila. Estas
  // creaciones son inherentemente secuenciales por fila -necesitamos el id
  // de cada una-, pero al estar contra una tabla precargada solo pegan a la
  // base cuando el club/regatista es realmente nuevo.
  const filasResueltas: {
    regatistaId: string;
    flota?: string;
    flotaOrden?: number;
    puestoOficial?: number;
    totalOficial?: number;
    regatas: ParseResult['regatas'];
  }[] = [];

  for (const row of parsedData) {
    // En clases de doble tripulación (29er, 420, etc.) la fuente trae a
    // los dos regatistas en una sola celda ("Fulano & Mengano"). Cada uno
    // es una persona real con su propio historial, así que quedan como
    // regatistas separados -ambos con el mismo resultado en cada regata,
    // ya que compitieron juntos en el mismo bote.
    const nombresTripulacion = splitNombreTripulacion(row.nombre.trim());
    // El club a veces viene como "CUBA-CVB" -cada tripulante navega para
    // un club distinto, no es un club compuesto- así que resolvemos el
    // club de cada persona por separado, no uno solo para toda la fila.
    const clubesTripulacion = row.club
      ? splitClubPorTripulante(row.club, nombresTripulacion.length)
      : nombresTripulacion.map(() => '');

    for (let i = 0; i < nombresTripulacion.length; i++) {
      const nombreLimpio = nombresTripulacion[i];
      const clubPersona = clubesTripulacion[i];

      let clubId: string | null = null;
      if (clubPersona) {
        const clubStr = clubPersona.toUpperCase().trim();
        let club = clubPorNombre.get(clubStr);
        if (!club) {
          club = await prisma.club.upsert({
            where: { nombre: clubStr },
            update: {},
            create: { nombre: clubStr },
          });
          clubPorNombre.set(clubStr, club);
        }
        clubId = club.id;
      }

      const nombreKey = nombreLimpio.toLowerCase();
      let regatista = regatistaPorNombre.get(nombreKey);

      if (!regatista) {
        regatista = await prisma.regatista.create({
          data: {
            nombre: nombreLimpio,
            clubId,
            fuenteIds: { vela: row.vela },
          },
        });
        regatistaPorNombre.set(nombreKey, regatista);
        regatistasNuevos++;
      }

      filasResueltas.push({
        regatistaId: regatista.id,
        flota: row.flota,
        flotaOrden: row.flotaOrden,
        puestoOficial: row.puestoOficial,
        totalOficial: row.totalOficial,
        regatas: row.regatas,
      });
    }
  }

  // 3. Resolver (o crear) las Regatas de este campeonato una sola vez,
  // fuera del loop de regatistas -antes era un find-or-create por cada
  // (regatista x regata), miles de round-trips de más.
  const numerosNecesarios = new Set<number>();
  for (const fila of filasResueltas) {
    for (const r of fila.regatas) numerosNecesarios.add(r.numero);
  }

  const regatasExistentes = await prisma.regata.findMany({ where: { campeonatoId } });
  const regataPorNumero = new Map(regatasExistentes.map(r => [r.numero, r]));

  for (const numero of numerosNecesarios) {
    if (!regataPorNumero.has(numero)) {
      const regata = await prisma.regata.create({ data: { campeonatoId, numero } });
      regataPorNumero.set(numero, regata);
      regatasNuevas++;
    }
  }

  // 4. Insertar/actualizar los Resultados. Es el grueso de las escrituras
  // (regatistas x regatas), así que las corremos con concurrencia acotada
  // en vez de una por una.
  const resultadosAInsertar: {
    regataId: string;
    regatistaId: string;
    puesto: number;
    puntos: number;
    observacion: string | null;
    flota?: string;
    flotaOrden?: number;
    puestoOficial?: number;
    totalOficial?: number;
  }[] = [];

  for (const fila of filasResueltas) {
    for (const regataData of fila.regatas) {
      const regata = regataPorNumero.get(regataData.numero)!;

      // Determinar puntos. Cuando la fuente (CSV/Excel) ya trae un puntaje
      // bruto junto al código de observación (ej: "74 DNF"), confiamos en
      // ese número -Sailwave ya lo calculó correctamente contra el tamaño
      // real de esa flota/regata puntual, que puede no coincidir con
      // `totalInscritos` (el total de ESTE import, que puede combinar
      // varias flotas). Solo recurrimos al estándar de bajo puntaje
      // (inscriptos + 1) cuando la fuente no trajo ningún número (999).
      let puntos = regataData.puntajeBruto;
      if (puntos === 999) {
        puntos = totalInscritos + 1;
      }

      resultadosAInsertar.push({
        regataId: regata.id,
        regatistaId: fila.regatistaId,
        puesto: puntos,
        puntos,
        observacion: regataData.observacion,
        flota: fila.flota,
        flotaOrden: fila.flotaOrden,
        puestoOficial: fila.puestoOficial,
        totalOficial: fila.totalOficial,
      });
    }
  }

  await runWithConcurrency(resultadosAInsertar, 20, async (r) => {
    await prisma.resultado.upsert({
      where: {
        regataId_regatistaId: {
          regataId: r.regataId,
          regatistaId: r.regatistaId,
        },
      },
      update: {
        puesto: r.puesto, // aproxima el puesto al puntaje en regatas normales
        puntos: r.puntos,
        observacion: r.observacion,
        flota: r.flota,
        flotaOrden: r.flotaOrden,
        puestoOficial: r.puestoOficial,
        totalOficial: r.totalOficial,
      },
      create: {
        regataId: r.regataId,
        regatistaId: r.regatistaId,
        puesto: r.puesto,
        puntos: r.puntos,
        observacion: r.observacion,
        flota: r.flota,
        flotaOrden: r.flotaOrden,
        puestoOficial: r.puestoOficial,
        totalOficial: r.totalOficial,
      },
    });
    resultadosInsertados++;
  });

  return {
    success: true,
    stats: {
      totalInscritos,
      regatistasNuevos,
      regatasNuevas,
      resultadosInsertados,
    },
  };
}
