// Importamos el submódulo directamente (no el entrypoint del paquete): el
// index.js de pdf-parse@1.1.1 ejecuta código de "modo debug" al cargarse
// cuando module.parent es undefined -algo que pasa durante el tracing de
// build de Next.js- e intenta leer un PDF de test que no existe, rompiendo
// el build. Ver: https://gitlab.com/autokent/pdf-parse/-/issues/24
import pdf from 'pdf-parse/lib/pdf-parse.js';
import { ParseResult } from './csv-parser';

export async function parsePdfToResult(buffer: Buffer): Promise<ParseResult[]> {
  const data = await pdf(buffer);
  const text = data.text;
  
  if (text.trim().length < 50) {
    throw new Error('El PDF parece estar escaneado como imagen (sin texto) o está vacío. Por favor, usá el formato CSV.');
  }

  // A very basic Sailwave PDF text parser.
  // This would need complex regex to reliably parse all formats.
  // We will assume it finds lines with numbers, names, and points.
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const regatistas: ParseResult[] = [];

  for (const line of lines) {
    // extremely naive regex looking for: Rank | SailNo | Name | ... | Points
    const match = line.match(/^(\d+)\s+([A-Z]{3}\s*\d+)\s+([^0-9]+)\s+(.+)$/);
    if (match) {
      regatistas.push({
        nombre: match[3].trim(),
        club: 'Desconocido',
        vela: match[2].trim(),
        regatas: [] // Parsing race-by-race points from unstructured text is deeply error-prone without OCR grids.
      });
    }
  }

  if (regatistas.length === 0) {
    throw new Error('No se pudo identificar una tabla de resultados en el texto del PDF. El formato es incompatible. Recomendamos subir el archivo CSV de Sailwave.');
  }

  return regatistas;
}
