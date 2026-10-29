import type { ColumnMapping } from '@/lib/extractors/xlsx-parser';
import type { ColumnaSugerida } from '@/lib/extractors/column-detector';
import type { ParseResult } from '@/lib/extractors/csv-parser';

// Carga automática de los resultados del Campeonato Argentino de 420 2026,
// organizado por el Club de Veleros Barlovento. Una tarea de GitHub Actions
// (ver .github/workflows/barlovento-420.yml) llama cada 10 minutos a
// /api/cron/barlovento, que lee la página del evento, busca el archivo de
// resultados y lo importa. Este archivo tiene las partes puras (sin base de
// datos ni red) para poder probarlas.

export const PAGINA_BARLOVENTO =
  'https://barlovento.org.ar/campeonato-argentino-420-31-de-octubre-y-1-7-y-8-de-noviembre-de-2026/';

// Días de regata (fecha de Argentina) y hora desde la que se mira la página.
export const FECHAS_DE_REGATA = ['2026-10-31', '2026-11-01', '2026-11-07', '2026-11-08'];
export const HORA_DESDE = 14;

/** ¿Es un día de regata y ya pasaron las 14 h de Argentina (UTC-3, sin horario de verano)? */
export function dentroDeVentana(ahora: Date = new Date()): boolean {
  const ar = new Date(ahora.getTime() - 3 * 60 * 60 * 1000);
  const fecha = ar.toISOString().slice(0, 10);
  return FECHAS_DE_REGATA.includes(fecha) && ar.getUTCHours() >= HORA_DESDE;
}

export interface ArchivoDeResultados {
  url: string;
  texto: string;
}

const EXTENSIONES = /\.(pdf|xlsx?|csv)(\?.*)?$/i;
// Documentos del evento que NO son resultados (aviso, instrucciones, etc.).
const NO_ES_RESULTADO = /aviso|\bavr\b|avr[_-]|instrucc|\bir[-_ ]|invitaci|circular|enmienda|programa|protesta|inscrip|formulario|autoriz|seguro|medici|planilla de|reglamento/i;
const ES_RESULTADO = /resultad|clasific|posicion|general|overall|sailwave|ranking|results?|\bres[-_ ]/i;
// Enlaces a otros sitios donde suelen publicarse resultados.
const SITIO_EXTERNO = /manage2sail|sailwave\.com|racingrules|regatta|sail-?results|docs\.google|drive\.google/i;

function limpiar(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&#8211;/g, '-').replace(/\s+/g, ' ').trim();
}

/**
 * Busca en el HTML de la página los archivos que parecen ser los resultados
 * (pdf, xlsx o csv cuyo nombre o texto habla de resultados / clasificación) y,
 * aparte, los enlaces a otros sitios que podrían tenerlos.
 */
export function buscarArchivosDeResultados(
  html: string,
  base: string = PAGINA_BARLOVENTO
): { archivos: ArchivoDeResultados[]; externos: string[] } {
  const archivos: ArchivoDeResultados[] = [];
  const externos: string[] = [];
  const vistos = new Set<string>();

  for (const m of html.matchAll(/<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    let url: URL;
    try {
      url = new URL(m[1].trim(), base);
    } catch {
      continue;
    }
    if (url.protocol === 'http:') url.protocol = 'https:';
    const texto = limpiar(m[2]);
    const nombre = decodeURIComponent(url.pathname.split('/').pop() ?? '');
    const clave = url.toString();
    if (vistos.has(clave)) continue;
    vistos.add(clave);

    if (EXTENSIONES.test(url.pathname)) {
      const conjunto = `${nombre} ${texto}`;
      if (NO_ES_RESULTADO.test(conjunto)) continue;
      if (ES_RESULTADO.test(conjunto)) archivos.push({ url: clave, texto });
    } else if (SITIO_EXTERNO.test(url.hostname) && url.hostname !== new URL(base).hostname && ES_RESULTADO.test(`${texto} ${url.pathname}`)) {
      externos.push(clave);
    }
  }
  return { archivos, externos };
}

/**
 * Si hay varios archivos de resultados, elige el general (el que dice general,
 * overall, final o acumulado). Con uno solo, ese. Si no se puede decidir,
 * devuelve null: mejor avisar que importar el equivocado.
 */
export function elegirArchivoGeneral(archivos: ArchivoDeResultados[]): ArchivoDeResultados | null {
  if (archivos.length === 1) return archivos[0];
  const generales = archivos.filter((a) => /general|overall|final|acumulad|clasificaci/i.test(`${a.url} ${a.texto}`));
  return generales.length === 1 ? generales[0] : null;
}

/**
 * Convierte las columnas que sugirió el detector en el mapeo que usa el
 * importador. null si falta algo imprescindible (puesto, navegante, total o
 * alguna regata): en ese caso no se importa nada.
 */
export function mapeoDesdeSugerencias(columnas: ColumnaSugerida[]): ColumnMapping | null {
  const primera = (rol: ColumnaSugerida['rol']) => columnas.find((c) => c.rol === rol);
  const puesto = primera('puesto');
  const navegantes = columnas.filter((c) => c.rol === 'navegante');
  const total = primera('total');
  const regatas = columnas
    .filter((c) => c.rol === 'regata')
    .map((c, i) => ({ colIndex: c.index, numero: c.numeroRegata ?? i + 1 }));
  if (!puesto || navegantes.length === 0 || !total || regatas.length === 0) return null;

  const clubes = columnas.filter((c) => c.rol === 'club');
  return {
    puestoCol: puesto.index,
    velaCol: primera('vela')?.index ?? -1,
    nombreCol: navegantes[0].index,
    nombreColsExtra: navegantes.slice(1).map((c) => c.index),
    clubCol: clubes[0]?.index ?? -1,
    clubColsExtra: clubes.slice(1).map((c) => c.index),
    flotaCol: primera('flota')?.index ?? null,
    totalCol: total.index,
    regataCols: regatas,
  };
}

/** Problemas que impiden publicar con tranquilidad. Lista vacía = se puede importar. */
export function validarResultados(filas: ParseResult[]): string[] {
  const problemas: string[] = [];
  if (filas.length < 3) problemas.push(`Solo se leyeron ${filas.length} participantes`);
  const sinRegatas = filas.filter((f) => f.regatas.length === 0).length;
  if (sinRegatas > 0) problemas.push(`${sinRegatas} participantes sin ninguna regata`);

  const cantidad = filas.map((f) => f.regatas.length).sort((a, b) => a - b);
  const mediana = cantidad[Math.floor(cantidad.length / 2)] ?? 0;
  if (mediana === 0) problemas.push('No se detectó ninguna columna de regata con datos');

  const conPuesto = filas.filter((f) => f.puestoOficial !== undefined);
  if (conPuesto.length > 0) {
    const puestos = conPuesto.map((f) => f.puestoOficial as number);
    if (!puestos.includes(1)) problemas.push('Ningún participante figura en el puesto 1');
    if (Math.max(...puestos) > filas.length + 5) problemas.push('Los puestos no coinciden con la cantidad de participantes');
  }
  const sinTotal = filas.filter((f) => f.totalOficial === undefined).length;
  if (sinTotal > filas.length / 2) problemas.push('No se leyó el total de la mayoría de los participantes');
  return problemas;
}

/**
 * Cantidad de descartes con la que cierran los totales del archivo: la menor
 * cantidad de peores regatas que, restadas al bruto de cada uno, da su total.
 * Un DNE no se puede descartar. null si ninguna cantidad cierra para todos.
 */
export function inferirDescartes(filas: ParseResult[]): number | null {
  const conTotal = filas.filter((f) => f.totalOficial !== undefined && f.regatas.length > 0);
  if (conTotal.length === 0) return null;
  const maxRegatas = Math.max(...conTotal.map((f) => f.regatas.length));

  for (let d = 0; d <= Math.floor(maxRegatas / 2); d++) {
    const cierra = conTotal.every((f) => {
      const bruto = f.regatas.reduce((s, r) => s + r.puntajeBruto, 0);
      const descartables = f.regatas
        .filter((r) => !/^\(?DNE\b/i.test(r.observacion ?? ''))
        .map((r) => r.puntajeBruto)
        .sort((a, b) => b - a);
      const descartado = descartables.slice(0, d).reduce((s, v) => s + v, 0);
      return Math.abs(bruto - descartado - (f.totalOficial as number)) < 0.01;
    });
    if (cierra) return d;
  }
  return null;
}
