'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X, Trophy, BarChart3, User, LogIn, Home, Building2 } from 'lucide-react';
import { SailingBoat } from '@/components/icons/sailing-boat';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { NotificationBell } from '@/components/layout/notification-bell';

import { useSession, signOut } from 'next-auth/react';
import { LogOut, Shield } from 'lucide-react';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();

  // "Inicio" lleva a la home, que también es donde está el buscador de
  // regatistas (SailorSearch, en el hero) -un atajo directo desde
  // cualquier página en vez de tener que volver haciendo click en el logo.
  const navLinks = [
    { href: '/', label: 'Inicio', icon: Home },
    { href: '/campeonatos', label: 'Campeonatos', icon: Trophy },
    { href: '/clubes', label: 'Clubes', icon: Building2 },
    { href: '/rankings', label: 'Rankings', icon: BarChart3 },
  ];

  const isAdmin = session?.user?.role === 'ADMIN';
  // El link "Admin" también es visible para ORGANIZADOR -aterriza en
  // /admin/campeonatos (ver src/app/admin/page.tsx), la única sección a
  // la que tiene acceso. La campanita de solicitudes pendientes sigue
  // siendo exclusiva de ADMIN (ver isAdmin arriba), no algo que le
  // corresponda ver a un organizador.
  const puedeVerAdmin = isAdmin || session?.user?.role === 'ORGANIZADOR';

  // Bloquear el scroll del body mientras el menú móvil está abierto -sin
  // esto, se podía scrollear la página de atrás mientras el menú estaba
  // desplegado encima, algo que se siente raro en mobile (el contenido de
  // atrás se mueve pero el menú que tapa la pantalla, no).
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-surface shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <SailingBoat className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold text-foreground">FAY Stats</span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex md:items-center md:gap-6">
            <div className="flex items-center gap-4">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary',
                      isActive ? 'text-primary' : 'text-muted'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                );
              })}
              {puedeVerAdmin && (
                <Link
                  href="/admin"
                  className={cn(
                    'flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary',
                    pathname.startsWith('/admin') ? 'text-primary' : 'text-accent'
                  )}
                >
                  <Shield className="h-4 w-4" />
                  Admin
                </Link>
              )}
              {isAdmin && <NotificationBell />}
            </div>
            <div className="flex items-center gap-2 border-l border-border pl-6">
              {session ? (
                <>
                  <Link href="/mi-perfil">
                    <Button variant="ghost" size="sm" className="gap-2">
                      <User className="h-4 w-4 text-primary" />
                      {session.user.name || 'Mi Perfil'}
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: '/' })} className="gap-2 text-red-400 hover:text-red-300">
                    <LogOut className="h-4 w-4" />
                    Salir
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" size="sm" className="gap-2">
                      <LogIn className="h-4 w-4" />
                      Ingresar
                    </Button>
                  </Link>
                  <Link href="/registro">
                    <Button variant="default" size="sm" className="gap-2">
                      <User className="h-4 w-4" />
                      Registro
                    </Button>
                  </Link>
                </>
              )}
            </div>
            <ThemeToggle />
          </div>

          {/* Mobile Menu Button -el ícono pasa de hamburguesa a X con un
              cross-fade + rotación en vez de reemplazarse de golpe. El
              toggle de tema va al lado, siempre visible (no hace falta
              abrir el menú para cambiar de tema). */}
          <div className="flex items-center gap-1 md:hidden">
            {isAdmin && <NotificationBell />}
            <ThemeToggle />
            <button
              onClick={() => setIsOpen(!isOpen)}
              aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
              className="relative inline-flex items-center justify-center rounded-md p-2 h-9 w-9 text-muted hover:bg-surface-hover hover:text-foreground focus:outline-none active:scale-90 transition-transform"
            >
              <Menu className={cn(
                'h-6 w-6 absolute transition-[opacity,transform] duration-200 ease-out',
                isOpen ? 'opacity-0 rotate-45' : 'opacity-100 rotate-0'
              )} />
              <X className={cn(
                'h-6 w-6 absolute transition-[opacity,transform] duration-200 ease-out',
                isOpen ? 'opacity-100 rotate-0' : 'opacity-0 -rotate-45'
              )} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu -antes aparecía/desaparecía instantáneo (montaje
          condicional sin transición). El truco de grid-template-rows
          0fr→1fr anima a "altura automática" sin tener que medir el alto
          real en JS -el contenido sigue montado siempre (así el toggle es
          instantáneo al tocar de nuevo, sin esperar a que desmonte), solo
          se colapsa visualmente. */}
      <div
        className={cn(
          'md:hidden grid overflow-hidden transition-[grid-template-rows] duration-200 ease-out',
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="min-h-0 overflow-hidden border-t border-border bg-surface">
          <div className="space-y-1 px-4 pb-3 pt-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-base font-medium',
                    isActive ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-surface-hover hover:text-foreground'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {link.label}
                </Link>
              );
            })}
            {puedeVerAdmin && (
              <Link
                href="/admin"
                onClick={() => setIsOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-base font-medium',
                  pathname.startsWith('/admin') ? 'bg-primary/10 text-primary' : 'text-accent hover:bg-surface-hover'
                )}
              >
                <Shield className="h-5 w-5" />
                Admin
              </Link>
            )}
            {/*
              El menú móvil antes solo mostraba Ingresar/Registro fijos,
              aunque el usuario ya estuviera logueado: sin acceso a "Mi
              Perfil", "Salir" ni "Admin" desde el celular. Ahora refleja
              la sesión igual que la barra de desktop.
            */}
            <div className="mt-4 grid grid-cols-2 gap-2 pt-4 border-t border-border">
              {session ? (
                <>
                  <Link href="/mi-perfil" onClick={() => setIsOpen(false)}>
                    <Button variant="secondary" className="w-full gap-2">
                      <User className="h-4 w-4 text-primary" />
                      {session.user.name || 'Mi Perfil'}
                    </Button>
                  </Link>
                  <Button
                    variant="secondary"
                    className="w-full gap-2 text-red-400"
                    onClick={() => { setIsOpen(false); signOut({ callbackUrl: '/' }); }}
                  >
                    <LogOut className="h-4 w-4" />
                    Salir
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setIsOpen(false)}>
                    <Button variant="secondary" className="w-full gap-2">
                      <LogIn className="h-4 w-4" />
                      Ingresar
                    </Button>
                  </Link>
                  <Link href="/registro" onClick={() => setIsOpen(false)}>
                    <Button variant="default" className="w-full gap-2">
                      <User className="h-4 w-4" />
                      Registro
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
