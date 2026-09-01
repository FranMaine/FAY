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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} dark`}>
      <body className="min-h-screen flex flex-col bg-background text-foreground antialiased">
        <SessionProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-border py-6 text-center text-sm text-muted">
            <p>FAY Stats © {new Date().getFullYear()} — Estadísticas de Vela Argentina</p>
          </footer>
        </SessionProvider>
      </body>
    </html>
  );
}
