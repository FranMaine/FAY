import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { SITE_URL } from "@/lib/site";
import { jsonLdSeguro } from "@/lib/json-ld";
import { getRegatistaProfile } from "@/lib/get-regatista-profile";
import { PerfilRegatista } from "@/components/regatista/perfil-regatista";

// Sin esto, el perfil queda cacheado estático para siempre después de la
// primera visita -si esa persona corre una nueva regata, nadie ve el
// resultado nuevo en su perfil hasta el próximo deploy. ISR de 60s, igual
// que el resto de las páginas que muestran datos que cambian.
export const revalidate = 60;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const regatista = await prisma.regatista.findUnique({
    where: { id },
    select: { nombre: true, club: { select: { nombre: true } } },
  });

  if (!regatista) return { title: "Regatista no encontrado" };

  const club = regatista.club?.nombre;
  return {
    title: regatista.nombre,
    description: `Historial de resultados de ${regatista.nombre}${club ? ` (${club})` : ""} en campeonatos de vela de Argentina.`,
  };
}

export default async function RegatistaProfilePage({ params }: Props) {
  const { id } = await params;
  const data = await getRegatistaProfile(id);

  if (!data) {
    notFound();
  }

  const { regatista } = data;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: regatista.nombre,
    nationality: regatista.pais || undefined,
    memberOf: regatista.club ? { "@type": "SportsOrganization", name: regatista.club.nombre } : undefined,
    url: `${SITE_URL}/regatistas/${regatista.id}`,
  };

  return (
    <main className="min-h-dvh bg-background text-foreground pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdSeguro(jsonLd) }}
      />
      <PerfilRegatista {...data} volverHref="/" />
    </main>
  );
}
