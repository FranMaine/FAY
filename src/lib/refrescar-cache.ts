import { revalidateTag } from 'next/cache';

// Los rankings, la lista de clubes y de campeonatos se guardan en caché (ver
// ranking-general.ts, campeonatos-lista.ts) para no consultar la base en cada
// visita. Esto los invalida al instante: se llama después de cualquier cambio
// del admin que pueda alterarlos (fusionar regatistas o clubes, cambiar el
// club de alguien, el nombre o el escudo de un club...) -si no, el cambio
// recién se vería cuando venza el caché.
export function refrescarRankings() {
  revalidateTag('rankings', { expire: 0 });
}
