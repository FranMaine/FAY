import { describe, it, expect } from 'vitest';
import { senalesDeSolicitud, similitudDeNombres, verificacionSchema, type DatosParaSenales } from '../vinculacion';

const base: DatosParaSenales = {
  nombreCuenta: 'María Maine',
  nombreFicha: 'MAINE María',
  clubFicha: 'CVSI',
  numeroVelaFicha: 'ARG 123',
  declarado: { numeroVela: 'arg123', club: 'CVSI', ultimoCampeonato: '', declaro: true },
  cuentaCreadaEn: new Date('2026-09-01T00:00:00Z'),
  ahora: new Date('2026-10-15T00:00:00Z'),
  solicitudesDeLaCuenta: 1,
};

describe('verificacionSchema', () => {
  it('pide al menos un dato y la declaración', () => {
    expect(verificacionSchema.safeParse({ declaro: true }).success).toBe(false);
    expect(verificacionSchema.safeParse({ club: 'YCA' }).success).toBe(false);
    expect(verificacionSchema.safeParse({ club: 'YCA', declaro: true }).success).toBe(true);
    expect(verificacionSchema.safeParse({ ultimoCampeonato: 'Semana 2026', declaro: true }).success).toBe(true);
  });

  it('recorta espacios y rechaza textos larguísimos', () => {
    const r = verificacionSchema.parse({ club: '  YCA  ', declaro: true });
    expect(r.club).toBe('YCA');
    expect(verificacionSchema.safeParse({ club: 'x'.repeat(200), declaro: true }).success).toBe(false);
  });
});

describe('similitudDeNombres', () => {
  it('ignora orden, tildes y mayúsculas', () => {
    expect(similitudDeNombres('María Maine', 'MAINE Maria')).toBe(1);
  });
  it('es parcial cuando coinciden algunas palabras', () => {
    expect(similitudDeNombres('María Maine', 'Maine Tomás')).toBe(0.5);
  });
  it('es 0 si no hay nada en común o falta un nombre', () => {
    expect(similitudDeNombres('Ana Gómez', 'Beto Ruiz')).toBe(0);
    expect(similitudDeNombres('', 'Beto')).toBe(0);
  });
});

describe('senalesDeSolicitud', () => {
  const textos = (d: DatosParaSenales) => senalesDeSolicitud(d).map((s) => `${s.gravedad}:${s.texto}`);

  it('todo coincide: solo señales ok', () => {
    const s = senalesDeSolicitud(base);
    expect(s.every((x) => x.gravedad === 'ok')).toBe(true);
    expect(s.length).toBe(3);
  });

  it('alerta si el nombre de la cuenta no se parece al de la ficha', () => {
    expect(textos({ ...base, nombreCuenta: 'Juan Pérez' }).some((t) => t.startsWith('alerta:El nombre'))).toBe(true);
  });

  it('aviso si el nombre coincide solo en parte', () => {
    expect(textos({ ...base, nombreCuenta: 'María Pérez' }).some((t) => t.startsWith('aviso:El nombre'))).toBe(true);
  });

  it('alerta si el número de vela o el club declarados no coinciden con la ficha', () => {
    const t = textos({ ...base, declarado: { numeroVela: 'ARG 999', club: 'YCA', declaro: true } });
    expect(t.some((x) => x.startsWith('alerta:Declaró el número de vela ARG 999'))).toBe(true);
    expect(t.some((x) => x.startsWith('alerta:Declaró el club "YCA"'))).toBe(true);
  });

  it('avisa si no hay datos declarados (solicitud vieja)', () => {
    expect(textos({ ...base, declarado: null }).some((t) => t.startsWith('aviso:La persona no aportó'))).toBe(true);
  });

  it('avisa de cuentas recién creadas y alerta de solicitudes múltiples', () => {
    const t = textos({ ...base, cuentaCreadaEn: new Date('2026-10-14T20:00:00Z'), solicitudesDeLaCuenta: 3 });
    expect(t.some((x) => x.startsWith('aviso:La cuenta se creó hace menos de un día'))).toBe(true);
    expect(t.some((x) => x.startsWith('alerta:Esta cuenta ya hizo 3'))).toBe(true);
  });
});
