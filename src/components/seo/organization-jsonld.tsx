import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";
import { jsonLdSeguro } from "@/lib/json-ld";

// Datos estructurados (schema.org) de la organización, en el layout raíz
// -así aparece en TODAS las páginas sin tener que repetirlo. Ayuda a que
// buscadores (y el panel de conocimiento de Google) entiendan que este
// sitio es Regateando, no contenido suelto sin dueño. Va como JSON-LD (el formato que Google recomienda)
// en vez de microdatos inline, que ensuciarían cada componente.
export function OrganizationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "SportsOrganization",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    sport: "Sailing",
    areaServed: {
      "@type": "Country",
      name: "Argentina",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdSeguro(data) }}
    />
  );
}

export function WebsiteJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    inLanguage: "es-AR",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdSeguro(data) }}
    />
  );
}
