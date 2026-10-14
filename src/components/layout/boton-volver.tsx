'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { actualizarPila, destinoVolver } from '@/lib/navegacion';

// "Volver" en todas las páginas menos el inicio, justo debajo de la barra de
// navegación. Está en el layout (no en cada página) para que no haya que
// acordarse de ponerlo en las nuevas, y porque en la app instalada en el
// celular no hay botón "atrás" del navegador. Ver lib/navegacion.ts para a
// dónde lleva en cada caso.
//
// IMPORTANTE: este componente renderiza LO MISMO en todas las rutas -nunca
// decide con usePathname() si se dibuja o no-. La primera versión hacía
// `if (pathname === '/') return null`, pero en el HTML que el servidor
// genera el pathname no llegaba a ser "/" en el inicio: el botón salía en
// la home y, al hidratar, quedaba un nodo huérfano que nadie gestionaba (no
// se iba al navegar y se sumaba al botón real: dos "Volver"). Ahora la
// visibilidad es CSS (ver .boton-volver en globals.css) según el atributo
// data-ruta de <html>: lo fija un script en el <head> antes del primer
// pintado (RUTA_INIT_SCRIPT en lib/navegacion.ts, usado en layout.tsx), y
// acá se mantiene al día en cada navegación.
export function BotonVolver() {
  const pathname = usePathname();
  const router = useRouter();
  const pila = useRef<string[]>([pathname]);

  // useLayoutEffect: corre antes de que el navegador pinte, así al cambiar
  // de página la fila aparece/desaparece junto con el contenido nuevo, sin
  // un cuadro intermedio con la página corrida.
  useLayoutEffect(() => {
    document.documentElement.dataset.ruta = pathname === '/' ? 'inicio' : 'interna';
  }, [pathname]);

  useEffect(() => {
    pila.current = actualizarPila(pila.current, pathname);
  }, [pathname]);

  function volver() {
    const destino = destinoVolver(pila.current, pathname);
    if (destino.tipo === 'historial') router.back();
    else router.push(destino.href);
  }

  return (
    <div className="boton-volver container mx-auto px-4 pt-3">
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
