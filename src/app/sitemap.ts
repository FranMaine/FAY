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
  const [campeonatos, regatistas, clubes] = await Promise.all([
    // Solo lo publicado: un campeonato en BORRADOR no es visible ni
    // debería quedar linkeado desde ningún lado, sitemap incluido.
    prisma.campeonato.findMany({
      where: { estado: 'PUBLICADO' },
      select: { id: true, updatedAt: true },
    }),
    prisma.regatista.findMany({
      select: { id: true, updatedAt: true },
    }),
    // Solo los que tienen al menos un regatista -un club vacío (o un
    // combo de varios clubes sin arreglar, ver la auditoría de datos) no
    // tiene ninguna página con contenido real que valga indexar.
    prisma.club.findMany({
      where: { regatistas: { some: {} } },
      select: { id: true },
    }),
  ]);

  const estaticas: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/campeonatos`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/clubes`, changeFrequency: 'weekly', priority: 0.7 },
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

  // Club no tiene createdAt/updatedAt en el schema -sin lastModified acá,
  // a diferencia de campeonatos/regatistas.
  const deClubes: MetadataRoute.Sitemap = clubes.map((c) => ({
    url: `${SITE_URL}/clubes/${c.id}`,
    changeFrequency: 'monthly',
    priority: 0.4,
  }));

  return [...estaticas, ...deCampeonatos, ...deRegatistas, ...deClubes];
}
