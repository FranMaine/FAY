import { describe, it, expect } from 'vitest';
import { parseSailwaveCSV } from '../csv-parser';

describe('parseSailwaveCSV', () => {
  it('parsea nombre, club y regatas numeradas', () => {
    const r = parseSailwaveCSV('Vela,Nombre,Club,R1,R2\n123,Ana Perez,CNSI,1,3\n');
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ vela: '123', nombre: 'Ana Perez', club: 'CNSI' });
    expect(r[0].regatas).toEqual([
      { numero: 1, puntajeBruto: 1, observacion: null },
      { numero: 2, puntajeBruto: 3, observacion: null },
    ]);
  });

  it('acepta encabezados alternativos (SAIL / NAME) sin importar mayúsculas', () => {
    const r = parseSailwaveCSV('sail,name,r1\n7,Juan Gomez,2\n');
    expect(r[0]).toMatchObject({ vela: '7', nombre: 'Juan Gomez' });
  });

  it('separa el código de penalidad del puntaje', () => {
    const r = parseSailwaveCSV('Nombre,R1,R2,R3\nAna,74 DNF,RET,5\n');
    expect(r[0].regatas).toEqual([
      { numero: 1, puntajeBruto: 74, observacion: 'DNF' },
      { numero: 2, puntajeBruto: 999, observacion: 'RET' },
      { numero: 3, puntajeBruto: 5, observacion: null },
    ]);
  });

  it('saltea filas sin nombre y celdas de regata vacías', () => {
    const r = parseSailwaveCSV('Nombre,R1,R2\n,1,2\nAna,,4\n');
    expect(r).toHaveLength(1);
    expect(r[0].regatas).toEqual([{ numero: 2, puntajeBruto: 4, observacion: null }]);
  });

  it('ignora columnas que no son regatas', () => {
    const r = parseSailwaveCSV('Nombre,Total,RX\nAna,10,5\n');
    expect(r[0].regatas).toEqual([]);
  });
});
