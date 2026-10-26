'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useSession } from 'next-auth/react';

// Ids de los regatistas que la persona tiene en favoritos, compartidos por
// todos los botones de estrella de la pantalla: se piden una sola vez y,
// cuando uno cambia, todos se actualizan sin volver a pedir nada.
interface Estado {
  ids: ReadonlySet<string>;
  cargado: boolean;
  perfilUso: 'NAVEGANTE' | 'FAMILIAR' | 'ESPECTADOR' | null;
}

let estado: Estado = { ids: new Set(), cargado: false, perfilUso: null };
let pidiendo: Promise<void> | null = null;
const oyentes = new Set<() => void>();

function emitir(nuevo: Estado) {
  estado = nuevo;
  oyentes.forEach((o) => o());
}

function suscribir(o: () => void) {
  oyentes.add(o);
  return () => {
    oyentes.delete(o);
  };
}

function cargar(): Promise<void> {
  if (pidiendo) return pidiendo;
  pidiendo = fetch('/api/favoritos?solo=ids')
    .then((res) => (res.ok ? res.json() : null))
    .then((json: { ids?: string[]; perfilUso?: Estado['perfilUso'] } | null) => {
      emitir({ ids: new Set(json?.ids ?? []), cargado: true, perfilUso: json?.perfilUso ?? null });
    })
    .catch(() => {
      // Sin red: la estrella queda como "no marcada" y se reintenta en la próxima visita.
      emitir({ ...estado, cargado: true });
    })
    .finally(() => {
      pidiendo = null;
    });
  return pidiendo;
}

/** Vuelve a pedir la lista (ej: al cerrar sesión y entrar con otra cuenta). */
export function reiniciarFavoritos() {
  emitir({ ids: new Set(), cargado: false, perfilUso: null });
}

export function useFavoritos() {
  const { status } = useSession();
  const actual = useSyncExternalStore(suscribir, () => estado, () => estado);

  useEffect(() => {
    if (status === 'authenticated' && !actual.cargado) void cargar();
    if (status === 'unauthenticated' && (actual.cargado || actual.ids.size > 0)) reiniciarFavoritos();
  }, [status, actual.cargado, actual.ids.size]);

  const esFavorito = useCallback((id: string) => actual.ids.has(id), [actual.ids]);

  /** Agrega o quita; devuelve un mensaje de error si el servidor lo rechazó. */
  const alternar = useCallback(async (id: string): Promise<string | null> => {
    const estabaMarcado = estado.ids.has(id);
    // Optimista: la estrella cambia al toque y se revierte si falla.
    const con = new Set(estado.ids);
    if (estabaMarcado) con.delete(id);
    else con.add(id);
    emitir({ ...estado, ids: con });

    try {
      const res = await fetch(estabaMarcado ? `/api/favoritos/${encodeURIComponent(id)}` : '/api/favoritos', {
        method: estabaMarcado ? 'DELETE' : 'POST',
        headers: estabaMarcado ? undefined : { 'Content-Type': 'application/json' },
        body: estabaMarcado ? undefined : JSON.stringify({ regatistaId: id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || 'No se pudo guardar el cambio');
      }
      return null;
    } catch (err) {
      const revertido = new Set(estado.ids);
      if (estabaMarcado) revertido.add(id);
      else revertido.delete(id);
      emitir({ ...estado, ids: revertido });
      return err instanceof Error ? err.message : 'No se pudo guardar el cambio';
    }
  }, []);

  return {
    autenticado: status === 'authenticated',
    cargando: status === 'loading' || (status === 'authenticated' && !actual.cargado),
    ids: actual.ids,
    perfilUso: actual.perfilUso,
    esFavorito,
    alternar,
  };
}
