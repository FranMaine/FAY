import { describe, it, expect } from 'vitest';
import { calcularLogrosPersonales, type LogroHistorialEntry, type LogroRegatistaInfo } from '../logros';

function entry(overrides: Partial<LogroHistorialEntry> = {}): LogroHistorialEntry {
  return {
    campeonatoId: 'c1',
    campeonatoNombre: 'Campeonato',
    evento: null,
    claseId: 'clase-1',
    anio: 2024,
    fecha: new Date('2024-01-01'),
    posicion: 5,
    totalInscriptos: 20,
    diferenciaSegundo: null,
    resultados: [],
    ...overrides,
  };
}

function regatista(overrides: Partial<LogroRegatistaInfo> = {}): LogroRegatistaInfo {
  return { id: 'r1', clubId: 'club-1', otrosClubesIds: [], ...overrides };
}

function idsDesbloqueados(historial: LogroHistorialEntry[], reg = regatista()) {
  return calcularLogrosPersonales(historial, reg).map((l) => l.id);
}

describe('calcularLogrosPersonales', () => {
  it('no desbloquea nada sin historial', () => {
    expect(calcularLogrosPersonales([], regatista())).toEqual([]);
  });

  it('debut, primeros puntos, primer podio y primera victoria según la mejor posición', () => {
    const historial = [entry({ posicion: 1 })];
    const ids = idsDesbloqueados(historial);
    expect(ids).toContain('debut');
    expect(ids).toContain('primeros-puntos');
    expect(ids).toContain('primer-podio');
    expect(ids).toContain('primera-victoria');
  });

  it('no desbloquea primer podio si nunca llegó al top 3', () => {
    const historial = [entry({ posicion: 8 })];
    const ids = idsDesbloqueados(historial);
    expect(ids).toContain('primeros-puntos');
    expect(ids).not.toContain('primer-podio');
    expect(ids).not.toContain('primera-victoria');
  });

  it('mejora constante requiere 3 campeonatos seguidos mejorando', () => {
    const mejorando = [
      entry({ fecha: new Date('2022-01-01'), posicion: 10 }),
      entry({ fecha: new Date('2023-01-01'), posicion: 6 }),
      entry({ fecha: new Date('2024-01-01'), posicion: 2 }),
    ];
    expect(idsDesbloqueados(mejorando)).toContain('mejora-constante');

    const noMejorando = [
      entry({ fecha: new Date('2022-01-01'), posicion: 10 }),
      entry({ fecha: new Date('2023-01-01'), posicion: 2 }),
      entry({ fecha: new Date('2024-01-01'), posicion: 6 }),
    ];
    expect(idsDesbloqueados(noMejorando)).not.toContain('mejora-constante');
  });

  it('racha de podios detecta 3 regatas seguidas en el top 3', () => {
    const historial = [
      entry({
        resultados: [
          { regataNumero: 1, puesto: 5, descartado: false },
          { regataNumero: 2, puesto: 2, descartado: false },
          { regataNumero: 3, puesto: 1, descartado: false },
          { regataNumero: 4, puesto: 3, descartado: false },
        ],
      }),
    ];
    expect(idsDesbloqueados(historial)).toContain('racha-podios');
  });

  it('remontada: primera regata fuera del top 10, campeonato en podio', () => {
    const historial = [
      entry({
        posicion: 3,
        resultados: [
          { regataNumero: 1, puesto: 15, descartado: false },
          { regataNumero: 2, puesto: 2, descartado: false },
        ],
      }),
    ];
    expect(idsDesbloqueados(historial)).toContain('remontada');
  });

  it('doblete/triplete: ganó el mismo evento en 2+ años', () => {
    const historial = [
      entry({ evento: 'Serie X', anio: 2023, posicion: 1 }),
      entry({ evento: 'Serie X', anio: 2024, posicion: 1 }),
    ];
    expect(idsDesbloqueados(historial)).toContain('doblete-triplete');
  });

  it('veterano y capitán del timón por cantidad total de regatas', () => {
    const muchasRegatas = Array.from({ length: 50 }, (_, i) => ({ regataNumero: i, puesto: 5, descartado: false }));
    const historial = [entry({ resultados: muchasRegatas })];
    const ids = idsDesbloqueados(historial);
    expect(ids).toContain('veterano');
    expect(ids).not.toContain('capitan-timon');

    const masRegatas = Array.from({ length: 100 }, (_, i) => ({ regataNumero: i, puesto: 5, descartado: false }));
    expect(idsDesbloqueados([entry({ resultados: masRegatas })])).toContain('capitan-timon');
  });

  it('trayectoria larga requiere 5 años distintos', () => {
    const historial = [2020, 2021, 2022, 2023, 2024].map((anio) => entry({ anio, fecha: new Date(anio, 0, 1) }));
    expect(idsDesbloqueados(historial)).toContain('trayectoria-larga');
    expect(idsDesbloqueados(historial.slice(0, 4))).not.toContain('trayectoria-larga');
  });

  it('regular requiere 3+ campeonatos en el mismo año', () => {
    const historial = [entry({ campeonatoId: 'a' }), entry({ campeonatoId: 'b' }), entry({ campeonatoId: 'c' })];
    expect(idsDesbloqueados(historial)).toContain('regular');
  });

  it('sin descartes feos solo cuenta si hubo descartes y ninguno fuera del top 10', () => {
    const limpio = [
      entry({
        resultados: [
          { regataNumero: 1, puesto: 2, descartado: false },
          { regataNumero: 2, puesto: 8, descartado: true },
        ],
      }),
    ];
    expect(idsDesbloqueados(limpio)).toContain('sin-descartes');

    const sinDescartesReales = [entry({ resultados: [{ regataNumero: 1, puesto: 2, descartado: false }] })];
    expect(idsDesbloqueados(sinDescartesReales)).not.toContain('sin-descartes');

    const descarteFeo = [
      entry({
        resultados: [
          { regataNumero: 1, puesto: 2, descartado: false },
          { regataNumero: 2, puesto: 15, descartado: true },
        ],
      }),
    ];
    expect(idsDesbloqueados(descarteFeo)).not.toContain('sin-descartes');
  });

  it('multiclase y podio multiclase', () => {
    const historial = [
      entry({ claseId: 'optimist', posicion: 2 }),
      entry({ claseId: '420', posicion: 10 }),
      entry({ claseId: '29er', posicion: 3 }),
    ];
    const ids = idsDesbloqueados(historial);
    expect(ids).toContain('multiclase');
    expect(ids).toContain('podio-multiclase');
  });

  it('dos colores según clubes del regatista, no del historial', () => {
    const historial = [entry()];
    expect(idsDesbloqueados(historial, regatista({ otrosClubesIds: [] }))).not.toContain('dos-colores');
    expect(idsDesbloqueados(historial, regatista({ otrosClubesIds: ['club-2'] }))).toContain('dos-colores');
  });

  it('margen amplio exige flota grande y diferencia real con el 2°', () => {
    const conMargen = [entry({ posicion: 1, totalInscriptos: 10, diferenciaSegundo: 15 })];
    expect(idsDesbloqueados(conMargen)).toContain('margen-amplio');

    const flotaChica = [entry({ posicion: 1, totalInscriptos: 3, diferenciaSegundo: 15 })];
    expect(idsDesbloqueados(flotaChica)).not.toContain('margen-amplio');

    const margenChico = [entry({ posicion: 1, totalInscriptos: 10, diferenciaSegundo: 2 })];
    expect(idsDesbloqueados(margenChico)).not.toContain('margen-amplio');
  });

  it('imbatible: ganó todas las regatas de un campeonato con 2+ regatas', () => {
    const historial = [
      entry({
        resultados: [
          { regataNumero: 1, puesto: 1, descartado: false },
          { regataNumero: 2, puesto: 1, descartado: false },
        ],
      }),
    ];
    expect(idsDesbloqueados(historial)).toContain('imbatible');

    const unaSola = [entry({ resultados: [{ regataNumero: 1, puesto: 1, descartado: false }] })];
    expect(idsDesbloqueados(unaSola)).not.toContain('imbatible');
  });
});
