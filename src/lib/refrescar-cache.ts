import { revalidatePath, revalidateTag } from 'next/cache';

// Las páginas públicas (fichas de regatistas, campeonatos, clubes, rankings,
// inicio...) se guardan armadas y se vuelven a calcular como mucho una vez por
// hora (`revalidate = 3600` en cada página y en cada `unstable_cache`): es el
// tope de seguridad. Mientras tanto, CUALQUIER cambio que pueda alterarlas
// (importar o corregir resultados, publicar, renombrar o fusionar regatistas o
// clubes, cambiar un escudo o una foto, vincular una cuenta...) tiene que
// llamar a esta función: marca todo como vencido y la próxima visita de cada
// página la arma de nuevo con los datos nuevos. Así el cambio se ve al
// instante, sin pagar el recálculo cada minuto "por las dudas" (el plan gratis
// de Vercel tiene un tope mensual de CPU).
//
// Se invalida TODO el sitio a propósito, en vez de elegir página por página:
// una página olvidada quedaría mostrando datos viejos durante una hora, y el
// costo de invalidar de más es casi nulo (solo marca; cada página se recalcula
// recién cuando alguien la visita).
//
// Si se agrega una ruta o una función que modifica datos públicos, hay que
// llamar a refrescarSitio() ahí (hay un test que lo verifica en las rutas).
export function refrescarSitio() {
  // Datos cacheados con unstable_cache (rankings, lista de campeonatos, clubes...).
  revalidateTag('rankings', { expire: 0 });
  // Páginas ya armadas (ISR): todo lo que cuelga del layout raíz.
  revalidatePath('/', 'layout');
}

// Nombre anterior: se conserva porque lo usan varias rutas.
export const refrescarRankings = refrescarSitio;
