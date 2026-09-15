import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';
import { SITE_URL } from '@/lib/site';

// Sin esto, "next build" intenta pre-renderizar /sitemap.xml como parte
// del build (consultando la base en ese momento) -en un pipeline de CI/CD
// que compila sin DATABASE_URL apuntando a la base real (ej: un build de
// verificación), el build entero fallaba por esto. force-dynamic difiere
// la consulta al primer request real en producción, donde la base sí está
// disponible -un bot de búsqueda no pide /sitemap.xml con la frecuencia
// como para que valga la pena cachearlo.
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [campeonatos, regatistas] = await Promise.all([
    // Solo lo publicado: un campeonato en BORRADOR no es visible ni
    // debería quedar linkeado desde ningún lado, sitemap incluido.
    prisma.campeonato.findMany({
      where: { estado: 'PUBLICADO' },
      select: { id: true, updatedAt: true },
    }),
    prisma.regatista.findMany({
      select: { id: true, updatedAt: true },
    }),
  ]);

  const estaticas: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/campeonatos`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/rankings`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/aviso-legal`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/privacidad`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/cookies`, changeFrequency: 'yearly', priority: 0.2 },
  ];

  const deCampeonatos: MetadataRoute.Sitemap = campeonatos.map((c) => ({
    url: `${SITE_URL}/campeonatos/${c.id}`,
    lastModified: c.updatedAt,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  const deRegatistas: MetadataRoute.Sitemap = regatistas.map((r) => ({
    url: `${SITE_URL}/regatistas/${r.id}`,
    lastModified: r.updatedAt,
    changeFrequency: 'monthly',
    priority: 0.5,
  }));

  return [...estaticas, ...deCampeonatos, ...deRegatistas];
}
