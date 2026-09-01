'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Sailboat, Menu, X, Trophy, BarChart3, User, LogIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

import { useSession, signOut } from 'next-auth/react';
import { LogOut, Shield } from 'lucide-react';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();

  const navLinks = [
    { href: '/campeonatos', label: 'Campeonatos', icon: Trophy },
    { href: '/rankings', label: 'Rankings', icon: BarChart3 },
  ];

  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-surface shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <Sailboat className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold text-foreground">FAY Stats</span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex md:items-center md:gap-6">
            <div className="flex items-center gap-4">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname.startsWith(link.href);
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
              {isAdmin && (
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
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center rounded-md p-2 text-muted hover:bg-surface-hover hover:text-foreground focus:outline-none"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden border-t border-border bg-surface">
          <div className="space-y-1 px-4 pb-3 pt-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname.startsWith(link.href);
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
            <div className="mt-4 grid grid-cols-2 gap-2 pt-4 border-t border-border">
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
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
