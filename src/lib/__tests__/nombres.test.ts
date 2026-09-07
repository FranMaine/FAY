import { describe, it, expect } from 'vitest';
import {
  normalizarNombre,
  splitNombreTripulacion,
  splitClubPorTripulante,
  asignarClubesPorColumna,
} from '../nombres';

describe('normalizarNombre', () => {
  it('ignora mayúsculas y espacios de más', () => {
    expect(normalizarNombre('Tomas Maine')).toBe(normalizarNombre('  tomas   MAINE  '));
  });

  it('ignora el orden de nombre/apellido', () => {
    expect(normalizarNombre('Tomas Maine')).toBe(normalizarNombre('Maine Tomas'));
  });

  it('ignora acentos', () => {
    expect(normalizarNombre('José Pérez')).toBe(normalizarNombre('Jose Perez'));
  });

  it('distingue personas realmente distintas', () => {
    expect(normalizarNombre('Tomas Maine')).not.toBe(normalizarNombre('Tomas Mainero'));
  });
});

describe('splitNombreTripulacion', () => {
  it('separa por "&"', () => {
    expect(splitNombreTripulacion('Fulano & Mengano')).toEqual(['Fulano', 'Mengano']);
  });

  it('separa por " y " con espacios', () => {
    expect(splitNombreTripulacion('Ana Perez y Juan Diaz')).toEqual(['Ana Perez', 'Juan Diaz']);
  });

  it('no parte un apellido que contenga "y" pegada a otra letra', () => {
    expect(splitNombreTripulacion('Yago Videla Tejo')).toEqual(['Yago Videla Tejo']);
  });

  it('devuelve un solo elemento para una persona', () => {
    expect(splitNombreTripulacion('Juan Perez')).toEqual(['Juan Perez']);
  });
});

describe('splitClubPorTripulante', () => {
  it('parte un club combinado con "-" cuando la cuenta cierra', () => {
    expect(splitClubPorTripulante('CUBA-CVB', 2)).toEqual(['CUBA', 'CVB']);
  });

  it('también reconoce "/" como separador', () => {
    expect(splitClubPorTripulante('CUBA/CVB', 2)).toEqual(['CUBA', 'CVB']);
  });

  it('también reconoce "&" y " y " como separador', () => {
    expect(splitClubPorTripulante('CUBA & CVB', 2)).toEqual(['CUBA', 'CVB']);
    expect(splitClubPorTripulante('CUBA y CVB', 2)).toEqual(['CUBA', 'CVB']);
  });

  it('repite el club completo para ambos si no hay separador', () => {
    expect(splitClubPorTripulante('CUBA', 2)).toEqual(['CUBA', 'CUBA']);
  });

  it('repite el club completo si la cuenta no cierra (club con guión legítimo)', () => {
    // 3 personas pero el club solo tiene 2 partes -no hay forma de saber a
    // quién le toca cuál, así que se prefiere no adivinar.
    expect(splitClubPorTripulante('CNSI-B', 3)).toEqual(['CNSI-B', 'CNSI-B', 'CNSI-B']);
  });

  it('no toca nada para una sola persona', () => {
    expect(splitClubPorTripulante('CUBA-CVB', 1)).toEqual(['CUBA-CVB']);
  });
});

describe('asignarClubesPorColumna', () => {
  it('asigna un club por persona en orden', () => {
    expect(asignarClubesPorColumna(['CUBA', 'CVB'], 2)).toEqual(['CUBA', 'CVB']);
  });

  it('repite el último club conocido si faltan columnas', () => {
    expect(asignarClubesPorColumna(['CUBA'], 2)).toEqual(['CUBA', 'CUBA']);
  });

  it('recorta si sobran columnas', () => {
    expect(asignarClubesPorColumna(['CUBA', 'CVB', 'YCA'], 2)).toEqual(['CUBA', 'CVB']);
  });
});
