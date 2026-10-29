import { createHash } from 'node:crypto';
import { after, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { permitir } from '@/lib/rate-limit';
import { registrarAuditoria } from '@/lib/auditoria';
import { refrescarRankings } from '@/lib/refrescar-cache';
import { avisarResultadosPublicados } from '@/lib/avisos-resultados';
import { mensajeDeError } from '@/lib/utils';
import { leerGridPDF } from '@/lib/extractors/pdf-grid-reader';
import { leerGridXLSX, armarParseResult } from '@/lib/extractors/xlsx-parser';
import { parseSailwaveCSV, type ParseResult } from '@/lib/extractors/csv-parser';
import { detectarColumnas } from '@/lib/extractors/column-detector';
import { importCampeonatoResults } from '@/lib/extractors/import-service';
import {
  PAGINA_BARLOVENTO,
  buscarArchivosDeResultados,
  dentroDeVentana,
  elegirArchivoGeneral,
  inferirDescartes,
  mapeoDesdeSugerencias,
  validarResultados,
} from '@/lib/barlovento';

export const maxDuration = 60;

const ACCION = 'barlovento.importar';
const ACCION_FALLO = 'barlovento.fallo';
const ENTIDAD_FALLO = 'barlovento-420';
const ACTOR = { email: 'sistema', name: 'Importación automática (Barlovento)' };
const MAX_BYTES = 15 * 1024 * 1024;

// Lee la página del Campeonato Argentino de 420 (Club de Veleros Barlovento),
// busca el archivo de resultados y lo importa y publica. La llama una tarea de
// GitHub Actions cada 10 minutos los días de regata (ver
// .github/workflows/barlovento-420.yml).
//
// No lleva clave: siempre lee la misma página fija y es idempotente (reimportar
// el mismo archivo no cambia nada), así que llamarla de más no hace daño; solo
// está limitada en frecuencia. Fuera de los días y horas de regata no hace nada,
// salvo con ?prueba=1, que solo lee y muestra qué haría sin escribir en la base.
//
// Si encuentra un archivo y algo no cierra (no se entienden las columnas, los
// totales no coinciden...) NO importa nada y responde con error: la tarea queda
// en rojo y GitHub avisa por mail. Es preferible eso a publicar mal.
export async function POST(request: Request) {
  try {
    const prueba = new URL(request.url).searchParams.get('prueba') === '1';
    if (!(await permitir('cron-barlovento', 8, 60 * 1000))) {
      return NextResponse.json({ error: 'Demasiados pedidos' }, { status: 429 });
    }
    if (!prueba && !dentroDeVentana()) {
      return NextResponse.json({ saltado: 'Fuera de los días y horarios de regata' });
    }

    const pagina = await fetch(PAGINA_BARLOVENTO, { signal: AbortSignal.timeout(20_000), headers: { 'User-Agent': 'Orzando/1.0 (+https://orzando.com.ar)' } });
    if (!pagina.ok) throw new Error(`La página de Barlovento respondió ${pagina.status}`);
    const { archivos, externos } = buscarArchivosDeResultados(await pagina.text());

    if (archivos.length === 0) {
      return NextResponse.json({ archivos: 0, externos, mensaje: 'Todavía no hay un archivo de resultados en la página' });
    }
    const archivo = elegirArchivoGeneral(archivos);
    if (!archivo) {
      throw new Error(`Hay varios archivos de resultados y no se sabe cuál es el general: ${archivos.map((a) => a.url).join(' , ')}`);
    }

    const descarga = await fetch(archivo.url, { signal: AbortSignal.timeout(30_000), headers: { 'User-Agent': 'Orzando/1.0 (+https://orzando.com.ar)' } });
    if (!descarga.ok) throw new Error(`No se pudo bajar ${archivo.url} (${descarga.status})`);
    const buffer = Buffer.from(await descarga.arrayBuffer());
    if (buffer.length > MAX_BYTES) throw new Error('El archivo de resultados es demasiado grande');
    const hash = createHash('sha256').update(buffer).digest('hex');

    const campeonato = await campeonatoDelEvento(prueba);

    if (!prueba && campeonato) {
      const previo = await prisma.auditLog.findFirst({
        where: { accion: ACCION, entidadId: campeonato.id },
        orderBy: { createdAt: 'desc' },
        select: { detalle: true },
      });
      if ((previo?.detalle as { hash?: string } | null)?.hash === hash) {
        return NextResponse.json({ sinCambios: true, archivo: archivo.url });
      }
    }

    // Si este mismo archivo ya falló antes, no se vuelve a intentar (ni a avisar)
    // cada 10 minutos: avisa una vez por versión del archivo. ?reintentar=1 lo fuerza.
    const reintentar = new URL(request.url).searchParams.get('reintentar') === '1';
    if (!prueba && !reintentar) {
      const fallo = await prisma.auditLog.findFirst({
        where: { accion: ACCION_FALLO, entidadId: ENTIDAD_FALLO },
        orderBy: { createdAt: 'desc' },
        select: { detalle: true },
      });
      if ((fallo?.detalle as { hash?: string } | null)?.hash === hash) {
        return NextResponse.json({ falloConocido: true, archivo: archivo.url });
      }
    }

    let filas: ParseResult[];
    let descartes: number | null;
    try {
      filas = await leerResultados(buffer, archivo.url);
      const problemas = validarResultados(filas);
      if (problemas.length > 0) throw new Error(`No se importó: ${problemas.join('; ')}`);
      descartes = inferirDescartes(filas);
      if (descartes === null) throw new Error('No se importó: los totales del archivo no coinciden con ninguna cantidad de descartes');
    } catch (error) {
      if (!prueba) {
        await registrarAuditoria(ACTOR, ACCION_FALLO, 'Campeonato', ENTIDAD_FALLO, { url: archivo.url, hash, motivo: mensajeDeError(error) });
      }
      throw error;
    }

    const resumen = { archivo: archivo.url, participantes: filas.length, regatas: Math.max(...filas.map((f) => f.regatas.length)), descartes };
    if (prueba) return NextResponse.json({ prueba: true, ...resumen });

    const c = campeonato ?? (await campeonatoDelEvento(false, true))!;
    const resultado = await importCampeonatoResults(c.id, filas);

    await prisma.campeonato.update({
      where: { id: c.id },
      data: { descartes, estado: 'PUBLICADO', fuenteUrl: PAGINA_BARLOVENTO },
    });
    await registrarAuditoria(ACTOR, ACCION, 'Campeonato', c.id, { nombre: c.nombre, url: archivo.url, hash, ...resumen });
    refrescarRankings();
    // Mails a quienes figuran (o tienen en favoritos): al publicar, a todos; en las
    // actualizaciones siguientes, solo a quienes les cambió algo.
    after(() => avisarResultadosPublicados(c.id));

    return NextResponse.json({ importado: true, campeonatoId: c.id, ...resumen, stats: resultado.stats });
  } catch (error) {
    // 500 a propósito: así la tarea de GitHub queda en rojo y avisa por mail.
    console.error('[barlovento]', error);
    return NextResponse.json({ error: mensajeDeError(error, 'Error al importar') }, { status: 500 });
  }
}

async function leerResultados(buffer: Buffer, url: string): Promise<ParseResult[]> {
  const ext = new URL(url).pathname.toLowerCase().split('.').pop();
  if (ext === 'csv') return parseSailwaveCSV(buffer.toString('utf-8'));
  const { header, rows } = ext === 'pdf' ? await leerGridPDF(buffer) : leerGridXLSX(buffer);
  const mapeo = mapeoDesdeSugerencias(detectarColumnas(header, rows));
  if (!mapeo) throw new Error('No se pudo identificar el puesto, los nombres, las regatas o el total en el archivo');
  return armarParseResult(header, rows, mapeo);
}

// El campeonato de este evento en nuestra base. Se crea (en borrador, y recién
// se publica cuando el import sale bien) la primera vez que hace falta.
async function campeonatoDelEvento(soloLeer: boolean, crear = false) {
  const existente = await prisma.campeonato.findFirst({
    where: { nombre: 'Campeonato Argentino', anio: 2026, clase: { nombre: '420' } },
    select: { id: true, nombre: true },
  });
  if (existente || soloLeer || !crear) return existente;

  const [clase, sede] = await Promise.all([
    prisma.clase.findFirst({ where: { nombre: '420' }, select: { id: true } }),
    prisma.club.findFirst({ where: { nombre: 'CVB' }, select: { id: true } }),
  ]);
  if (!clase) throw new Error('No existe la clase 420 en la base');
  return prisma.campeonato.create({
    data: {
      nombre: 'Campeonato Argentino',
      anio: 2026,
      claseId: clase.id,
      sedeId: sede?.id ?? null,
      fechaInicio: new Date('2026-10-31T00:00:00.000Z'),
      fechaFin: new Date('2026-11-08T00:00:00.000Z'),
      estado: 'BORRADOR',
    },
    select: { id: true, nombre: true },
  });
}
