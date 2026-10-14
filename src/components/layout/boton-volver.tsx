'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { actualizarPila, destinoVolver } from '@/lib/navegacion';

// "Volver" en todas las páginas menos el inicio, justo debajo de la barra de
// navegación. Está en el layout (no en cada página) para que no haya que
// acordarse de ponerlo en las nuevas, y porque en la app instalada en el
// celular no hay botón "atrás" del navegador. Ver lib/navegacion.ts para a
// dónde lleva en cada caso.
export function BotonVolver() {
  const pathname = usePathname();
  const router = useRouter();
  const pila = useRef<string[]>([pathname]);

  useEffect(() => {
    pila.current = actualizarPila(pila.current, pathname);
  }, [pathname]);

  if (pathname === '/') return null;

  function volver() {
    const destino = destinoVolver(pila.current, pathname);
    if (destino.tipo === 'historial') router.back();
    else router.push(destino.href);
  }

  return (
    <div className="container mx-auto px-4 pt-3">
      <button
        type="button"
        onClick={volver}
        className="-ml-2.5 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-hover hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.97]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Volver
      </button>
    </div>
  );
}
