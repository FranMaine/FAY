import prisma from '@/lib/db';
import { ParseResult } from './csv-parser';
import { calcularPuntosPenalidad, esPenalidad } from '@/lib/scoring';

export async function importCampeonatoResults(campeonatoId: string, parsedData: ParseResult[]) {
  // Encontramos el campeonato para validar
  const campeonato = await prisma.campeonato.findUnique({
    where: { id: campeonatoId },
  });

  if (!campeonato) {
    throw new Error("Campeonato no encontrado");
  }

  const totalInscritos = parsedData.length;

  return await prisma.$transaction(async (tx: any) => {
    let regatistasNuevos = 0;
    let regatasNuevas = 0;
    let resultadosInsertados = 0;

    // Procesar cada regatista
    for (const row of parsedData) {
      // 1. Buscar o crear el Club
      let clubId = null;
      if (row.club) {
        const clubStr = row.club.toUpperCase().trim();
        let club = await tx.club.findFirst({
          where: { nombre: { equals: clubStr, mode: 'insensitive' } },
        });
        if (!club) {
          club = await tx.club.create({ data: { nombre: clubStr } });
        }
        clubId = club.id;
      }

      // 2. Buscar o crear el Regatista (Fase 2 simplificada: match por nombre exacto o crea nuevo)
      const nombreLimpio = row.nombre.trim();
      let regatista = await tx.regatista.findFirst({
        where: { nombre: { equals: nombreLimpio, mode: 'insensitive' } },
      });

      if (!regatista) {
        regatista = await tx.regatista.create({
          data: {
            nombre: nombreLimpio,
            clubId: clubId,
            fuenteIds: { vela: row.vela },
          },
        });
        regatistasNuevos++;
      }

      // 3. Crear Regatas e insertar Resultados
      for (const regataData of row.regatas) {
        // Buscar o crear la regata para este campeonato
        let regata = await tx.regata.findUnique({
          where: {
            campeonatoId_numero: {
              campeonatoId,
              numero: regataData.numero,
            },
          },
        });

        if (!regata) {
          regata = await tx.regata.create({
            data: {
              campeonatoId,
              numero: regataData.numero,
            },
          });
          regatasNuevas++;
        }

        // Determinar puntos
        let puntos = regataData.puntajeBruto;
        const penalidad = esPenalidad(regataData.observacion);
        if (penalidad) {
          puntos = calcularPuntosPenalidad(penalidad, totalInscritos);
        } else if (puntos === 999) {
          // Si era 999 pero no fue detectado como penalidad oficial, fallback al último + 1
          puntos = totalInscritos + 1; 
        }

        // Insertar o actualizar resultado
        await tx.resultado.upsert({
          where: {
            regataId_regatistaId: {
              regataId: regata.id,
              regatistaId: regatista.id,
            },
          },
          update: {
            puesto: puntos, // aproxima el puesto al puntaje en regatas normales
            puntos: puntos,
            observacion: regataData.observacion,
          },
          create: {
            regataId: regata.id,
            regatistaId: regatista.id,
            puesto: puntos,
            puntos: puntos,
            observacion: regataData.observacion,
          },
        });
        resultadosInsertados++;
      }
    }

    return {
      success: true,
      stats: {
        totalInscritos,
        regatistasNuevos,
        regatasNuevas,
        resultadosInsertados,
      },
    };
  }, {
    timeout: 30000, // Dar más tiempo a la transacción por ser carga masiva
  });
}
