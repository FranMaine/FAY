import { prisma } from "@/lib/db";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";

// RSS de los últimos campeonatos publicados -para quien quiera seguir la
// actividad del sitio con un lector de feeds en vez de entrar a mirar. Sin
// dependencias externas: es XML armado a mano, el formato es simple.
export async function GET() {
  const campeonatos = await prisma.campeonato.findMany({
    where: { estado: "PUBLICADO" },
    orderBy: { updatedAt: "desc" },
    take: 30,
    include: { clase: true, sede: true },
  });

  const items = campeonatos
    .map((c) => {
      const link = `${SITE_URL}/campeonatos/${c.id}`;
      const titulo = escaparXml(`${c.nombre} ${c.anio} (${c.clase.nombre})`);
      const descripcion = escaparXml(
        `Resultados de ${c.nombre} ${c.anio}${c.sede ? ` en ${c.sede.nombre}` : ""}, clase ${c.clase.nombre}.`
      );
      return `
    <item>
      <title>${titulo}</title>
      <link>${link}</link>
      <guid>${link}</guid>
      <pubDate>${c.updatedAt.toUTCString()}</pubDate>
      <description>${descripcion}</description>
    </item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escaparXml(SITE_NAME)}</title>
    <link>${SITE_URL}</link>
    <description>${escaparXml(SITE_DESCRIPTION)}</description>
    <language>es-AR</language>
    <atom:link xmlns:atom="http://www.w3.org/2005/Atom" href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      // Mismo criterio que sitemap.ts: no hace falta recalcularlo en cada
      // request, un lector de feeds no pide esto tan seguido.
      "Cache-Control": "public, max-age=3600",
    },
  });
}

function escaparXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
