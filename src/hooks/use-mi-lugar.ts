'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { LUGAR_PREDETERMINADO } from '@/lib/lugares';

// Slug del lugar de viento/clima de la persona: el de su club si entró con una
// cuenta vinculada a un regatista, o el predeterminado. Arranca siempre en el
// predeterminado (nadie espera a la sesión para ver el link/badge) y cambia
// cuando /api/mi-lugar responde. Si la API falla, queda en el predeterminado.
export function useMiLugar(): string {
  const { status } = useSession();
  const [slug, setSlug] = useState(LUGAR_PREDETERMINADO.slug);

  useEffect(() => {
    if (status !== 'authenticated') return;
    let cancelado = false;
    fetch('/api/mi-lugar')
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { slug?: string } | null) => {
        if (!cancelado && json?.slug) setSlug(json.slug);
      })
      .catch(() => {
        // Sin red: queda en el lugar predeterminado.
      });
    return () => {
      cancelado = true;
    };
  }, [status]);

  return slug;
}
