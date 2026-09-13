import type { Metadata } from 'next';
import { Geist, Geist_Mono, Prata } from 'next/font/google';
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

// Serif de acento para el titular del hero (--font-serif, mapeada en
// globals.css) -el resto del sitio es sans-serif (Geist) de punta a punta,
// así que reservamos este serif solo para ese único lugar donde queremos
// que se sienta más "editorial"/cinematográfico, no como una tipografía
// más del sistema.
const prata = Prata({
  variable: '--font-prata',
  subsets: ['latin'],
  weight: '400',
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} ${prata.variable} dark`}>
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
