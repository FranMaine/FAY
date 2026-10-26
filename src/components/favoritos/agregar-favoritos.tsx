"use client";

import { CheckIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BuscadorRegatistas } from "@/components/search/buscador-regatistas";
import { useFavoritos } from "@/hooks/use-favoritos";

// Buscador con botón "Agregar" por resultado, para armar la lista de
// favoritos desde la pantalla /favoritos.
export function AgregarFavoritos() {
  const { ids, alternar } = useFavoritos();

  async function agregar(id: string, nombre: string) {
    const error = await alternar(id);
    if (error) toast.error(error);
    else toast.success(`${nombre} está en tus favoritos`);
  }

  return (
    <BuscadorRegatistas
      placeholder="Buscar a quién agregar…"
      onSelect={(r) => {
        if (!ids.has(r.id)) void agregar(r.id, r.nombre);
      }}
      accion={(r) =>
        ids.has(r.id) ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
            <CheckIcon className="h-3.5 w-3.5" aria-hidden="true" /> Agregado
          </span>
        ) : (
          <Button type="button" size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={() => agregar(r.id, r.nombre)}>
            <PlusIcon className="h-3.5 w-3.5" aria-hidden="true" /> Agregar
          </Button>
        )
      }
    />
  );
}
