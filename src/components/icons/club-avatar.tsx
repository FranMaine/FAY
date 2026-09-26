import { ViewTransition } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

// Antes no teníamos el escudo real de ninguno de los clubes -esto le daba
// a cada uno una identidad visual propia y consistente en vez de mostrar
// el mismo ícono genérico en todos lados: un color y unas iniciales
// derivados del propio nombre. Ahora que un ADMIN puede cargar el escudo
// real desde /admin/clubes (ver logoUrl), este componente lo muestra
// cuando existe y cae de vuelta a las iniciales para los que todavía no
// tienen uno cargado.

function hashDeNombre(nombre: string): number {
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) {
    hash = (hash * 31 + nombre.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function colorDeClub(nombre: string): string {
  const hue = hashDeNombre(nombre) % 360;
  // Saturación/luminosidad fijas -varía el matiz entre clubes, no
  // qué tan "fuerte" se ve cada uno (uno no debería parecer más
  // importante que otro solo por el color que le tocó).
  return `hsl(${hue}, 45%, 38%)`;
}

function inicialesDeClub(nombre: string): string {
  const limpio = nombre.replace(/[^\p{L}\p{N}\s]/gu, " ").trim();
  const partes = limpio.split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
}

interface ClubAvatarProps {
  nombre: string;
  logoUrl?: string | null;
  /** Controla tamaño (w-*, h-*) y tipografía (text-*) -ej: "w-10 h-10 text-sm". */
  className?: string;
  /** Si se pasa, el escudo "viaja" entre páginas que lo muestren con el mismo nombre (ver globals.css). Debe ser único por página. */
  transitionName?: string;
}

export function ClubAvatar({ nombre, logoUrl, className, transitionName }: ClubAvatarProps) {
  const avatar = renderAvatar(nombre, logoUrl, className);
  if (!transitionName) return avatar;
  return (
    <ViewTransition name={transitionName} share="morph" default="none">
      {avatar}
    </ViewTransition>
  );
}

function renderAvatar(nombre: string, logoUrl: string | null | undefined, className?: string) {
  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt={nombre}
        width={200}
        height={200}
        className={cn("object-contain shrink-0", className)}
      />
    );
  }

  return (
    <div
      className={cn("rounded-full flex items-center justify-center font-bold text-white shrink-0", className)}
      style={{ backgroundColor: colorDeClub(nombre) }}
      aria-hidden="true"
    >
      {inicialesDeClub(nombre)}
    </div>
  );
}
