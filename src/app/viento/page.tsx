import type { Metadata } from 'next';
import { PaginaViento } from '@/components/viento/pagina-viento';
import { LUGAR_PREDETERMINADO } from '@/lib/lugares';

export const metadata: Metadata = {
  title: `Viento en ${LUGAR_PREDETERMINADO.nombre}`,
  description: 'Viento en tiempo real en nudos: la medición de la estación más cercana, las últimas 24 horas, el pronóstico de las próximas 24 y un mapa de viento.',
};

// Los datos se piden con revalidate de 10 min (ver lib/viento.ts), igual que
// el badge del navbar -esta página se regenera a ese ritmo. El resto de los
// lugares viven en /viento/[lugar].
export const revalidate = 600;

export default function VientoPage() {
  return <PaginaViento lugar={LUGAR_PREDETERMINADO} />;
}
