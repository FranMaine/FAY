import type { MetadataRoute } from 'next';

// Web App Manifest -permite "agregar a pantalla de inicio" en el celular
// (Android sobre todo; iOS usa esto de forma más limitada). Reusa los
// mismos íconos que ya generaba Next.js automáticamente a partir de
// src/app/icon.png y apple-icon.png -no hace falta generar assets nuevos.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Regateando',
    short_name: 'Regateando',
    description: 'Resultados, rankings y estadísticas de regatas de vela de Argentina.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#2563eb',
    icons: [
      { src: '/icon.png', sizes: '512x512', type: 'image/png' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };
}
