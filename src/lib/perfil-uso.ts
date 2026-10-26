import { HeartHandshake, Eye, Sailboat, type LucideIcon } from 'lucide-react';

export type PerfilUso = 'NAVEGANTE' | 'FAMILIAR' | 'ESPECTADOR';

interface OpcionUso {
  titulo: string;
  descripcion: string;
  /** Texto del botón / sugerencia según lo que elija. */
  accion: string;
  /** Adónde se lo lleva después de elegir. */
  destino: string;
  icono: LucideIcon;
}

// "¿Cómo vas a usar Orzando?": se pregunta al registrarse (paso 2) y en
// /bienvenida, y define la sugerencia que se le hace a cada persona.
export const OPCIONES_USO: Record<PerfilUso, OpcionUso> = {
  NAVEGANTE: {
    titulo: 'Soy navegante',
    descripcion: 'Compito y quiero ver mis propios resultados.',
    accion: 'Vincular mi nombre',
    destino: '/vincular',
    icono: Sailboat,
  },
  FAMILIAR: {
    titulo: 'Soy familiar',
    descripcion: 'Madre, padre o familiar de quien compite y quiero seguirlos.',
    accion: 'Agregar a mis favoritos',
    destino: '/favoritos',
    icono: HeartHandshake,
  },
  ESPECTADOR: {
    titulo: 'Solo miro la página',
    descripcion: 'Me interesan los resultados, rankings y el clima.',
    accion: 'Ir al inicio',
    destino: '/',
    icono: Eye,
  },
};
