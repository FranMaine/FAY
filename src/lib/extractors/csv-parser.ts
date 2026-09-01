import Papa from 'papaparse';

export interface ParseResult {
  vela: string;
  nombre: string;
  club: string;
  regatas: {
    numero: number;
    puntajeBruto: number;
    observacion: string | null;
  }[];
}

export function parseSailwaveCSV(csvContent: string): ParseResult[] {
  // Configuración de PapaParse para CSV
  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toUpperCase(),
  });

  const results: ParseResult[] = [];
  
  if (parsed.errors.length > 0) {
    throw new Error(`Error parseando CSV: ${parsed.errors[0].message}`);
  }

  const rows = parsed.data as Record<string, string>[];
  
  for (const row of rows) {
    const vela = row['VELA'] || row['SAIL'] || '';
    const nombre = row['NOMBRE'] || row['NAME'] || row['REGATISTA'] || '';
    const club = row['CLUB'] || '';

    // Si no hay nombre válido, saltamos la fila
    if (!nombre) continue;

    const regatas: ParseResult['regatas'] = [];

    // Buscamos columnas que representen regatas (R1, R2, etc)
    for (const key of Object.keys(row)) {
      const isRegataCol = /^R\d+$/.test(key); 
      if (isRegataCol) {
        const numero = parseInt(key.replace('R', ''), 10);
        const valorOriginal = row[key]?.trim() || '';
        
        if (!valorOriginal) continue; 

        let puntajeBruto = 0;
        let observacion: string | null = null;
        
        // Match numbers, even if they have parenthesis like "1 (RET)" or just "RET"
        const numMatch = valorOriginal.match(/\d+/);
        const charsMatch = valorOriginal.match(/[a-zA-Z]+/);

        if (numMatch && !charsMatch) {
          puntajeBruto = parseFloat(numMatch[0]);
        } else if (charsMatch) {
          observacion = charsMatch[0].toUpperCase();
          puntajeBruto = numMatch ? parseFloat(numMatch[0]) : 999; 
        }

        regatas.push({
          numero,
          puntajeBruto,
          observacion
        });
      }
    }

    results.push({
      vela,
      nombre,
      club,
      regatas
    });
  }

  return results;
}
