import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// /admin, /mi-perfil y /vincular son privados (requieren sesión, y /admin
// además requiere rol ADMIN) -no aportan nada indexados, y /admin en
// particular no debería aparecer nunca en un resultado de búsqueda. La API
// tampoco tiene sentido para un buscador.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/admin/', '/mi-perfil', '/vincular', '/api/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
