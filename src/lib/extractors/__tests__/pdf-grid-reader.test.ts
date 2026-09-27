import { describe, it, expect, vi } from 'vitest';

// pdf-grid-reader usa pdf-parse solo para que pdf.js le entregue, página por
// página, los items de texto con su posición (x/y) vía la opción
// `pagerender` -no nos interesa nada más de la librería real, así que la
// reemplazamos por una fake que llama a `pagerender` una vez por cada
// "página" que le pasemos en `paginas`.
type ItemFake = { str: string; x: number; y: number };
let paginas: ItemFake[][] = [];

vi.mock('pdf-parse/lib/pdf-parse.js', () => ({
  default: vi.fn(async (_buffer: Buffer, options: { pagerender: (p: unknown) => Promise<string> }) => {
    for (const items of paginas) {
      await options.pagerender({
        getTextContent: async () => ({
          items: items.map((it) => ({ str: it.str, transform: [1, 0, 0, 1, it.x, it.y] })),
        }),
      });
    }
    return { text: paginas.flat().map((i) => i.str).join(' ') };
  }),
}));

const { leerGridPDF } = await import('../pdf-grid-reader');

// Fila de encabezado típica: Pl | Sail | Crew | Club | Tot
const HEADER: ItemFake[] = [
  { str: 'Pl', x: 0, y: 100 },
  { str: 'Sail', x: 40, y: 100 },
  { str: 'Crew', x: 80, y: 100 },
  { str: 'Club', x: 200, y: 100 },
  { str: 'Tot', x: 260, y: 100 },
];

describe('leerGridPDF', () => {
  it('lee una fila de datos, separando nombre/club/total del bloque fusionado', async () => {
    paginas = [[
      ...HEADER,
      { str: '1', x: 0, y: 90 },
      { str: '123', x: 40, y: 90 },
      { str: 'Juan', x: 80, y: 90 },
      { str: 'Perez', x: 95, y: 90 },
      { str: 'CNSI', x: 180, y: 90 },
      { str: '5', x: 260, y: 90 },
    ]];

    const { header, rows } = await leerGridPDF(Buffer.from(''));
    expect(header).toEqual(['Pl', 'Sail', 'Crew', 'Club', 'Tot']);
    expect(rows).toEqual([['1', '123', 'Juan Perez', 'CNSI', '5']]);
  });

  it('separa un club compuesto por tripulante (CPNLB-CBRIO) del nombre y el total', async () => {
    paginas = [[
      ...HEADER,
      { str: '2', x: 0, y: 90 },
      { str: '456', x: 40, y: 90 },
      { str: 'Ana', x: 80, y: 90 },
      { str: 'Diaz', x: 95, y: 90 },
      { str: 'CPNLB', x: 180, y: 90 },
      { str: '-', x: 195, y: 90 },
      { str: 'CBRIO', x: 198, y: 90 },
      { str: '12', x: 260, y: 90 },
    ]];

    const { rows } = await leerGridPDF(Buffer.from(''));
    expect(rows[0]).toEqual(['2', '456', 'Ana Diaz', 'CPNLB-CBRIO', '12']);
  });

  it('ignora filas de encabezado repetidas en páginas siguientes', async () => {
    paginas = [
      [...HEADER, { str: '1', x: 0, y: 90 }, { str: '1', x: 40, y: 90 }, { str: 'Ana', x: 80, y: 90 }, { str: 'X', x: 200, y: 90 }, { str: '3', x: 260, y: 90 }],
      [...HEADER, { str: '2', x: 0, y: 90 }, { str: '2', x: 40, y: 90 }, { str: 'Beto', x: 80, y: 90 }, { str: 'Y', x: 200, y: 90 }, { str: '4', x: 260, y: 90 }],
    ];

    const { rows } = await leerGridPDF(Buffer.from(''));
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r[2])).toEqual(['Ana', 'Beto']);
  });

  it('descarta líneas que no son filas de datos (no arrancan con un número)', async () => {
    paginas = [[
      ...HEADER,
      { str: 'Club Náutico San Isidro - Resultados Oficiales', x: 0, y: 95 },
      { str: '1', x: 0, y: 90 },
      { str: '1', x: 40, y: 90 },
      { str: 'Ana', x: 80, y: 90 },
      { str: 'X', x: 200, y: 90 },
      { str: '3', x: 260, y: 90 },
    ]];

    const { rows } = await leerGridPDF(Buffer.from(''));
    expect(rows).toHaveLength(1);
  });

  it('rechaza un PDF sin texto (escaneado como imagen)', async () => {
    paginas = [[]];
    await expect(leerGridPDF(Buffer.from(''))).rejects.toThrow(/imagen escaneada/);
  });

  it('rechaza un PDF sin una fila de encabezado reconocible', async () => {
    paginas = [[
      { str: 'Hola', x: 0, y: 100 },
      { str: 'Mundo', x: 40, y: 100 },
    ]];
    await expect(leerGridPDF(Buffer.from(''))).rejects.toThrow(/encabezado reconocible/);
  });
});
