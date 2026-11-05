'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { urlViento } from '@/lib/lugares';

// En /viento (sin lugar en la dirección): si la persona entró con una cuenta
// vinculada a un club cuyo lugar es otro, la lleva a ese lugar. Se hace en el
// cliente porque /viento es una página cacheada igual para todos. Si en esta
// visita ya eligió un lugar a mano en el selector, no se la mueve.
export function IrAMiLugar({ actual }: { actual: string }) {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status !== 'authenticated') return;
    try {
      if (sessionStorage.getItem('viento-lugar-manual')) return;
    } catch {
      // sin sessionStorage se sigue de largo
    }
    let cancelado = false;
    fetch('/api/mi-lugar')
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { slug?: string } | null) => {
        if (!cancelado && json?.slug && json.slug !== actual) router.replace(urlViento(json.slug));
      })
      .catch(() => {
        // Sin red: queda donde está.
      });
    return () => {
      cancelado = true;
    };
  }, [status, actual, router]);

  return null;
}
