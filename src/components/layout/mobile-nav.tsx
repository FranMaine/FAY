'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sailboat, Trophy, BarChart3, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MobileNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Inicio', icon: Sailboat },
    { href: '/campeonatos', label: 'Campeonatos', icon: Trophy },
    { href: '/rankings', label: 'Rankings', icon: BarChart3 },
    { href: '/perfil', label: 'Perfil', icon: User },
  ];

  return (
    <div className="fixed bottom-0 z-50 w-full border-t border-border bg-surface md:hidden">
      <div className="flex h-16 items-center justify-around px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 w-16 h-full transition-colors',
                isActive ? 'text-primary' : 'text-muted hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
