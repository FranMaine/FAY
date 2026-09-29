"use client";

import { Button } from "@/components/ui/button";

const CLAVE_STORAGE = "fay-consentimiento";

// Vuelve a mostrar el banner de cookies (borrando la elección guardada y
// recargando) para que alguien pueda cambiar de opinión sin tener que
// borrar el localStorage a mano desde el navegador.
export function CambiarCookiesButton() {
  function cambiar() {
    try {
      localStorage.removeItem(CLAVE_STORAGE);
    } catch {
      // Sin storage disponible no hay nada guardado para borrar.
    }
    window.location.reload();
  }

  return (
    <Button size="sm" variant="outline" onClick={cambiar} className="rounded-full">
      Cambiar mis preferencias de cookies
    </Button>
  );
}
