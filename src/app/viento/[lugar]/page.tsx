import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { PaginaViento } from '@/components/viento/pagina-viento';
import { LUGAR_PREDETERMINADO, LUGARES, lugarPorSlug } from '@/lib/lugares';

export const revalidate = 600;
// Solo los lugares del catálogo: cualquier otro slug da 404 sin generar
// nada (ni pegarle a las APIs externas).
export const dynamicParams = false;

type Props = { params: Promise<{ lugar: string }> };

export function generateStaticParams() {
  return LUGARES.map((l) => ({ lugar: l.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lugar = lugarPorSlug((await params).lugar);
  if (!lugar) return { title: 'Lugar no encontrado' };
  return {
    title: `Viento en ${lugar.nombre}`,
    description: `Viento en tiempo real en nudos en ${lugar.nombre}: medición, últimas 24 horas, pronóstico de las próximas 24 y un mapa de viento.`,
  };
}

export default async function VientoLugarPage({ params }: Props) {
  const lugar = lugarPorSlug((await params).lugar);
  if (!lugar) notFound();
  // El predeterminado tiene una sola URL (/viento): sin esto, /viento/san-isidro
  // sería una copia exacta de /viento.
  if (lugar.slug === LUGAR_PREDETERMINADO.slug) redirect('/viento');
  return <PaginaViento lugar={lugar} />;
}
