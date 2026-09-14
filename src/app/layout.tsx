import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/layout/navbar';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'FAY Stats',
    template: '%s | FAY Stats',
  },
  description: 'Estadísticas y resultados de campeonatos de vela de la Federación Argentina de Yachting',
};

import { SessionProvider } from '@/components/providers/session-provider';
import { BackToTop } from '@/components/layout/back-to-top';

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
      </head>
      <body className="min-h-screen flex flex-col bg-background text-foreground antialiased">
        <SessionProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-border py-6 text-center text-sm text-muted">
            <p>FAY Stats © {new Date().getFullYear()} — Estadísticas de Vela Argentina</p>
          </footer>
          <BackToTop />
        </SessionProvider>
      </body>
    </html>
  );
}
