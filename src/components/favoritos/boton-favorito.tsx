"use client";

import Link from "next/link";
import { StarIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useFavoritos } from "@/hooks/use-favoritos";
import { cn } from "@/lib/utils";

interface Props {
  regatistaId: string;
  nombre: string;
  /** Solo la estrella, sin texto (para listas y tarjetas). */
  compacto?: boolean;
  className?: string;
}

// Estrella para agregar o quitar a un regatista de los favoritos. Sin sesión
// lleva a ingresar. No se muestra para el propio perfil vinculado (el
// servidor igual lo rechaza), eso lo decide quien lo usa.
export function BotonFavorito({ regatistaId, nombre, compacto = false, className }: Props) {
  const { autenticado, cargando, esFavorito, alternar } = useFavoritos();
  const marcado = esFavorito(regatistaId);

  if (!autenticado && !cargando) {
    return (
      <Link href="/login" className={className} title="Ingresá para agregar a favoritos">
        <Button variant="outline" size={compacto ? "icon" : "sm"} className="gap-2" aria-label={`Ingresá para agregar a ${nombre} a favoritos`}>
          <StarIcon className="w-4 h-4" aria-hidden="true" />
          {!compacto && "Agregar a favoritos"}
        </Button>
      </Link>
    );
  }

  async function onClick() {
    const error = await alternar(regatistaId);
    if (error) toast.error(error);
    else toast.success(marcado ? `${nombre} salió de tus favoritos` : `${nombre} está en tus favoritos`);
  }

  return (
    <Button
      type="button"
      variant={marcado ? "default" : "outline"}
      size={compacto ? "icon" : "sm"}
      className={cn("gap-2", className)}
      disabled={cargando}
      aria-pressed={marcado}
      aria-label={marcado ? `Quitar a ${nombre} de favoritos` : `Agregar a ${nombre} a favoritos`}
      onClick={onClick}
    >
      <StarIcon className={cn("w-4 h-4", marcado && "fill-current")} aria-hidden="true" />
      {!compacto && (marcado ? "En favoritos" : "Agregar a favoritos")}
    </Button>
  );
}
