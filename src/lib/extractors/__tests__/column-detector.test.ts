import { describe, it, expect } from 'vitest';
import { detectarColumnas } from '../column-detector';

// Genera una grilla sintética con puesto secuencial, vela único, nombres,
// club, total = suma de las regatas, y N columnas de regata -así se puede
// probar la detección tanto con encabezados conocidos como con encabezados
// genéricos que no dan ninguna pista textual.
function armarGrid(headers: string[]) {
  const nombres = ['Juan Perez', 'Ana Diaz', 'Pedro Gomez', 'Maria Lopez', 'Carlos Ruiz'];
  const clubes = ['CUBA', 'CVB', 'CNSI', 'YCA', 'CPNLB'];
  const rows = nombres.map((nombre, i) => {
    const r1 = (i + 1) * 2;
    const r2 = (i + 1) * 3;
    const total = r1 + r2;
    return [i + 1, 100 + i, nombre, clubes[i], total, r1, r2];
  });
  return { header: headers, rows };
}

describe('detectarColumnas', () => {
  it('detecta todo por encabezado cuando los nombres de columna son conocidos', () => {
    const { header, rows } = armarGrid(['Pl.', 'Sail #', 'Skipper', 'Club', 'Tot.', 'R1', 'R2']);
    const columnas = detectarColumnas(header, rows);

    expect(columnas.find((c) => c.rol === 'puesto')?.index).toBe(0);
    expect(columnas.find((c) => c.rol === 'vela')?.index).toBe(1);
    expect(columnas.find((c) => c.rol === 'navegante')?.index).toBe(2);
    expect(columnas.find((c) => c.rol === 'club')?.index).toBe(3);
    expect(columnas.find((c) => c.rol === 'total')?.index).toBe(4);
    expect(columnas.filter((c) => c.rol === 'regata')).toHaveLength(2);
  });

  it('detecta puesto/vela/navegante/total por la FORMA de los datos con encabezados genéricos', () => {
    const { header, rows } = armarGrid(['Columna A', 'Columna B', 'Columna C', 'Columna D', 'Columna E', 'Columna F', 'Columna G']);
    const columnas = detectarColumnas(header, rows);

    // Club no se detecta por forma a propósito (ver comentario en el
    // código) -pero el resto sí debería salir bien solo con los datos.
    expect(columnas.find((c) => c.rol === 'puesto')?.index).toBe(0);
    expect(columnas.find((c) => c.rol === 'vela')?.index).toBe(1);
    expect(columnas.find((c) => c.rol === 'navegante')?.index).toBe(2);
    expect(columnas.find((c) => c.rol === 'total')?.index).toBe(4);
  });

  it('columnas de texto sin rol reconocido quedan como "personalizada", no "ignorar"', () => {
    const header = ['Pl.', 'Sail #', 'Skipper', 'Club', 'Tot.', 'R1', 'DNI del padre'];
    const rows = [
      [1, 101, 'Juan Perez', 'CUBA', 5, 2, 'Juvenil'],
      [2, 102, 'Ana Diaz', 'CVB', 9, 4, 'Juvenil'],
    ];
    const columnas = detectarColumnas(header, rows);
    const categoria = columnas.find((c) => c.header === 'DNI del padre');
    expect(categoria?.rol).toBe('personalizada');
    expect(categoria?.nombrePersonalizada).toBe('DNI del padre');
  });

  it('una columna numérica sin rol reconocido después del total se propone como regata, no como personalizada', () => {
    // Distinto del caso de arriba a propósito: una columna de DNI/edad
    // numérica después del total es indistinguible de una regata más por
    // la sola FORMA de los datos -es el admin quien la pasa a
    // "Personalizada" a mano en la pantalla de confirmación si hace falta.
    const header = ['Pl.', 'Sail #', 'Skipper', 'Club', 'Tot.', 'R1', 'DNI'];
    const rows = [
      [1, 101, 'Juan Perez', 'CUBA', 5, 2, 30111222],
      [2, 102, 'Ana Diaz', 'CVB', 9, 4, 30333444],
    ];
    const columnas = detectarColumnas(header, rows);
    const dni = columnas.find((c) => c.header === 'DNI');
    expect(dni?.rol).toBe('regata');
  });

  it('numera las columnas de regata en el orden en que aparecen', () => {
    const { header, rows } = armarGrid(['Pl.', 'Sail #', 'Skipper', 'Club', 'Tot.', 'R1', 'R2']);
    const columnas = detectarColumnas(header, rows);
    const regatas = columnas.filter((c) => c.rol === 'regata').sort((a, b) => a.index - b.index);
    expect(regatas.map((c) => c.numeroRegata)).toEqual([1, 2]);
  });
});
