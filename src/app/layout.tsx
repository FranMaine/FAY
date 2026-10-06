import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/layout/navbar';
import { SITE_URL, SITE_DESCRIPTION } from '@/lib/site';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// viewport-fit=cover deja pintar bajo el notch (los elementos fijos ya
// compensan con env(safe-area-inset-*)); theme-color tiñe la barra de estado
// del navegador con el color de la navbar de cada tema, en vez de un
// blanco/negro genérico.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1e293b' },
  ],
};

export const metadata: Metadata = {
  // Sin esto, Next no puede resolver a URL absoluta las imágenes de
  // Open Graph/Twitter que se declaran como ruta relativa (ej: "/og.png")
  // -y tira un warning en cada build. También es la URL "canónica" que usa
  // por default para cualquier página que no declare la suya.
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Orzando',
    template: '%s | Orzando',
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    siteName: 'Orzando',
    description: SITE_DESCRIPTION,
    locale: 'es_AR',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Orzando',
    description: SITE_DESCRIPTION,
  },
};

import { SessionProvider } from '@/components/providers/session-provider';
import { BackToTop } from '@/components/layout/back-to-top';
import { CookieBanner } from '@/components/layout/cookie-banner';
import { BetaBanner } from '@/components/layout/beta-banner';
import { IaChat } from '@/components/admin/ia-chat';
import { AppToaster } from '@/components/providers/app-toaster';
import { OrganizationJsonLd, WebsiteJsonLd } from '@/components/seo/organization-jsonld';

// Script bloqueante: corre ANTES de que se pinte la página (va en <head>,
// no en un componente de React que recién se hidrata después). Sin esto,
// el sitio siempre arrancaría en claro por una fracción de segundo y
// recién después saltaría a oscuro si esa era la preferencia guardada -un
// flash del tema equivocado en cada carga. Lee localStorage; si no hay
// nada guardado (primera visita), usa la preferencia del sistema
// operativo/navegador (prefers-color-scheme).
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('fay-theme');
    var dark = stored === 'dark' || (stored !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: el script de arriba le agrega "dark" a
    // esta misma etiqueta ANTES de que React hidrate, si corresponde -el
    // server nunca puede saber esa preferencia (vive en localStorage del
    // navegador), así que su className siempre difiere del que arma el
    // cliente. Es la discrepancia esperada que da este patrón (mismo
    // approach que recomienda Next.js para dark mode); sin este flag,
    // React tira un warning de hidratación en cada carga con el toggle en
    // oscuro. Solo tapa esto -un nivel, un atributo-, no otros mismatches
    // reales en el resto del árbol.
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <OrganizationJsonLd />
        <WebsiteJsonLd />
      </head>
      <body className="min-h-dvh flex flex-col bg-background text-foreground antialiased">
        <SessionProvider>
          <a
            href="#contenido"
            className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-md focus:bg-primary-solid focus:px-4 focus:py-2 focus:text-white"
          >
            Saltar al contenido
          </a>
          <BetaBanner />
          <Navbar />
          <main id="contenido" className="flex-1">{children}</main>
          <footer className="border-t border-border py-6 text-center text-sm text-muted space-y-2">
            <p>Orzando © {new Date().getFullYear()} - Estadísticas de Vela Argentina</p>
            <nav className="flex items-center justify-center gap-4 text-xs flex-wrap">
              <a href="/reglas" className="hover:text-foreground hover:underline">Cómo se calculan los puntajes</a>
              <a href="/contacto" className="hover:text-foreground hover:underline">Contacto</a>
              <a href="/aviso-legal" className="hover:text-foreground hover:underline">Aviso legal</a>
              <a href="/privacidad" className="hover:text-foreground hover:underline">Privacidad</a>
              <a href="/cookies" className="hover:text-foreground hover:underline">Cookies</a>
              <a href="/agregar-app" className="hover:text-foreground hover:underline">Agregar app</a>
            </nav>
          </footer>
          <BackToTop />
          <CookieBanner />
          <IaChat />
          <AppToaster />
        </SessionProvider>
      </body>
    </html>
  );
}
