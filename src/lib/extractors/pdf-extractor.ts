import pdf from 'pdf-parse';
import { ParseResult } from './csv-parser';

export async function parsePdfToResult(buffer: Buffer): Promise<ParseResult> {
  const data = await pdf(buffer);
  const text = data.text;
  
  if (text.trim().length < 50) {
    throw new Error('El PDF parece estar escaneado como imagen (sin texto) o está vacío. Por favor, usá el formato CSV.');
  }

  // A very basic Sailwave PDF text parser.
  // This would need complex regex to reliably parse all formats.
  // We will assume it finds lines with numbers, names, and points.
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const regatistas: ParseResult['regatistas'] = [];

  for (const line of lines) {
    // extremely naive regex looking for: Rank | SailNo | Name | ... | Points
    const match = line.match(/^(\d+)\s+([A-Z]{3}\s*\d+)\s+([^0-9]+)\s+(.+)$/);
    if (match) {
      regatistas.push({
        nombre: match[3].trim(),
        club: 'Desconocido',
        vela: match[2].trim(),
        resultados: [] // Parsing race-by-race points from unstructured text is deeply error-prone without OCR grids.
      });
    }
  }

  if (regatistas.length === 0) {
    throw new Error('No se pudo identificar una tabla de resultados en el texto del PDF. El formato es incompatible. Recomendamos subir el archivo CSV de Sailwave.');
  }

  return { regatistas };
}
