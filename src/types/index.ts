export type { ClasificacionRegatista, ResultadoRegata, PenaltyCode } from '@/lib/scoring';

export interface CampeonatoConClasificacion {
  id: string;
  nombre: string;
  anio: number;
  clase: { id: string; nombre: string };
  sede: { id: string; nombre: string; ciudad: string | null } | null;
  fechaInicio: Date | null;
  fechaFin: Date | null;
  estado: 'BORRADOR' | 'PUBLICADO';
  descartes: number;
  totalRegatas: number;
  totalRegatistas: number;
}

export interface EstadisticasRegatista {
  regatistaId: string;
  nombre: string;
  club: string | null;
  campeonatos: Array<{
    campeonatoId: string;
    nombre: string;
    anio: number;
    clase: string;
    posicionFinal: number;
    totalRegatistas: number;
    totalNeto: number;
  }>;
  resumen: {
    totalCampeonatos: number;
    mejorPuesto: number;
    peorPuesto: number;
    promedioPuesto: number;
  };
}
