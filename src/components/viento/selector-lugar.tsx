'use client';

import { useRouter } from 'next/navigation';
import { urlViento } from '@/lib/lugares';

interface SelectorLugarProps {
  actual: string;
  lugares: readonly { slug: string; nombre: string }[];
}

// Cambia de lugar en /viento. Cada lugar es su propia página (se
// prerenderiza y se cachea como cualquier otra), así que esto es solo una
// navegación -no hay estado ni fetch del lado del cliente.
export function SelectorLugar({ actual, lugares }: SelectorLugarProps) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Lugar</span>
      <select
        value={actual}
        onChange={(e) => router.push(urlViento(e.target.value))}
        className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground transition-colors hover:border-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      >
        {lugares.map((l) => (
          <option key={l.slug} value={l.slug}>
            {l.nombre}
          </option>
        ))}
      </select>
    </label>
  );
}
