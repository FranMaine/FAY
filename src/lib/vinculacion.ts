import { z } from 'zod';
import { normalizarBusqueda, palabrasDeBusqueda } from '@/lib/busqueda-texto';

// Reglas de la vinculación entre una cuenta y una ficha de regatista. Sin
// base de datos ni React: lo usan la API (validar lo que declara la persona),
// el panel de administración (las señales para decidir) y las pruebas.

/** Lo que la persona declara al pedir la vinculación -la prueba de que es quien dice ser. */
export const verificacionSchema = z
  .object({
    numeroVela: z.string().trim().max(30, 'Máximo 30 caracteres').optional().default(''),
    club: z.string().trim().max(80, 'Máximo 80 caracteres').optional().default(''),
    ultimoCampeonato: z.string().trim().max(120, 'Máximo 120 caracteres').optional().default(''),
    declaro: z.literal(true, { message: 'Tenés que confirmar que este perfil es tuyo' }),
  })
  .refine((v) => v.numeroVela || v.club || v.ultimoCampeonato, {
    message: 'Completá al menos un dato: número de vela, club o último campeonato',
    path: ['numeroVela'],
  });

export type VerificacionDeclarada = z.infer<typeof verificacionSchema>;

/** Qué porcentaje de las palabras de `a` aparece en `b` (sin tildes ni mayúsculas ni orden). */
export function similitudDeNombres(a: string, b: string): number {
  const palabrasA = palabrasDeBusqueda(a);
  const palabrasB = new Set(palabrasDeBusqueda(b));
  if (palabrasA.length === 0 || palabrasB.size === 0) return 0;
  const enComun = palabrasA.filter((p) => palabrasB.has(p)).length;
  return enComun / palabrasA.length;
}

export type Gravedad = 'ok' | 'aviso' | 'alerta';
export interface Senal {
  gravedad: Gravedad;
  texto: string;
}

export interface DatosParaSenales {
  nombreCuenta: string | null;
  nombreFicha: string;
  clubFicha: string | null;
  numeroVelaFicha: string | null;
  /** Lo que declaró la persona (null si la solicitud es de antes de que se pidiera). */
  declarado: Partial<VerificacionDeclarada> | null;
  cuentaCreadaEn: Date;
  ahora: Date;
  /** Cuántas solicitudes de vinculación hizo esta cuenta en total (la actual incluida). */
  solicitudesDeLaCuenta: number;
}

const UN_DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Señales que ayudan al administrador a decidir si una solicitud es creíble.
 * No aprueban ni rechazan nada: son solo evidencia a la vista.
 */
export function senalesDeSolicitud(d: DatosParaSenales): Senal[] {
  const senales: Senal[] = [];

  if (!d.nombreCuenta?.trim()) {
    senales.push({ gravedad: 'aviso', texto: 'La cuenta no tiene nombre cargado' });
  } else {
    const similitud = Math.max(
      similitudDeNombres(d.nombreCuenta, d.nombreFicha),
      similitudDeNombres(d.nombreFicha, d.nombreCuenta)
    );
    if (similitud >= 0.99) senales.push({ gravedad: 'ok', texto: 'El nombre de la cuenta coincide con el de la ficha' });
    else if (similitud >= 0.5) senales.push({ gravedad: 'aviso', texto: 'El nombre de la cuenta coincide solo en parte con el de la ficha' });
    else senales.push({ gravedad: 'alerta', texto: 'El nombre de la cuenta no se parece al de la ficha' });
  }

  if (!d.declarado) {
    senales.push({ gravedad: 'aviso', texto: 'La persona no aportó datos de verificación (solicitud anterior a que se pidieran)' });
  } else {
    const { numeroVela, club } = d.declarado;
    if (numeroVela && d.numeroVelaFicha) {
      const coincide = normalizarBusqueda(numeroVela).replace(/\s+/g, '') === normalizarBusqueda(d.numeroVelaFicha).replace(/\s+/g, '');
      senales.push(
        coincide
          ? { gravedad: 'ok', texto: 'El número de vela declarado coincide con el de la ficha' }
          : { gravedad: 'alerta', texto: `Declaró el número de vela ${numeroVela}, pero la ficha tiene ${d.numeroVelaFicha}` }
      );
    }
    if (club && d.clubFicha) {
      const coincide = palabrasDeBusqueda(d.clubFicha).every((p) => palabrasDeBusqueda(club).includes(p));
      senales.push(
        coincide
          ? { gravedad: 'ok', texto: 'El club declarado coincide con el de la ficha' }
          : { gravedad: 'alerta', texto: `Declaró el club "${club}", pero la ficha figura en ${d.clubFicha}` }
      );
    }
  }

  if (d.ahora.getTime() - d.cuentaCreadaEn.getTime() < UN_DIA_MS) {
    senales.push({ gravedad: 'aviso', texto: 'La cuenta se creó hace menos de un día' });
  }
  if (d.solicitudesDeLaCuenta > 1) {
    senales.push({ gravedad: 'alerta', texto: `Esta cuenta ya hizo ${d.solicitudesDeLaCuenta} solicitudes de vinculación` });
  }

  return senales;
}

/** Acciones de auditoría con las que se guarda lo declarado (ver /api/vincular). */
export const ACCION_SOLICITUD = 'vinculacion.solicitar';
