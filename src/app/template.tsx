"use client";

import { useEffect, useState } from "react";

// A diferencia de layout.tsx (persiste entre navegaciones), template.tsx se
// vuelve a montar en cada cambio de ruta -así el fade+rise de .page-enter
// (ver globals.css) se dispara solo en cada navegación, sin tener que
// engancharse a ningún evento del router. El Navbar y el footer quedan
// afuera (viven en layout.tsx), así que solo el contenido de la página
// entra con la transición; la barra de navegación no parpadea entre
// rutas.
//
// La clase "page-enter" se saca del todo (no solo se deja terminar la
// animación) apenas termina -ver el comentario largo en globals.css:
// dejarla puesta con fill-mode "both"/"forwards" convertía a este div en
// el "containing block" de cualquier position:fixed adentro (modales, el
// botón de volver arriba, el aviso de cookies), que terminaban
// posicionados relativos al contenido de la página en vez de a la
// ventana -en una página larga, aparecían lejos y había que scrollear
// para encontrarlos.
const DURACION_MS = 350;

export default function Template({ children }: { children: React.ReactNode }) {
  const [animando, setAnimando] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => setAnimando(false), DURACION_MS);
    return () => clearTimeout(timeout);
  }, []);

  return <div className={animando ? "page-enter" : undefined}>{children}</div>;
}
