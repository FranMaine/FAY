import type { NextConfig } from "next";

// Un año en segundos, para el header HSTS (Strict-Transport-Security):
// le dice al navegador "de acá a un año, no vuelvas a intentar este sitio
// por HTTP ni una sola vez, andá directo a HTTPS" -sin esto, la primera
// visita de cada usuario (o cualquiera que escriba/pegue el link sin
// "https://") pasa por un redirect 307 en vez de ir directo a la versión
// segura.
const UN_ANIO_EN_SEGUNDOS = 60 * 60 * 24 * 365;

// Content-Security-Policy: limita de dónde puede cargar scripts, imágenes,
// etc. el navegador -si algún día se cuela un script inyectado, no puede
// llamar a un servidor ajeno ni cargar código de afuera.
//
// - script-src con 'unsafe-inline' (y SIN nonce) a propósito: Next
//   hidrata con scripts inline, y la alternativa con nonce obliga a que
//   TODAS las páginas se rendericen dinámicas en cada request (se pierde el
//   ISR de la home, rankings, perfiles, etc.). Igual bloquea cualquier
//   script cargado desde un origen que no sea el propio.
// - img-src: escudos y fotos viven en Vercel Blob; blob:/data: para el
//   preview al subir un logo. Los logos de Apple/Android de /agregar-app
//   son locales (/public/brands), sin depender de una CDN externa.
// - frame-src: solo el embed oficial de Windy (mapa de viento de /viento).
// - connect-src 'self': el clima (Open-Meteo/aviationweather) se pide desde
//   el servidor (/api/clima), no desde el navegador.
// - Si se suman analítica o publicidad (ver el aviso de cookies), hay que
//   sumar acá sus dominios de script-src/connect-src/img-src/frame-src.
// - Solo en producción: en desarrollo React Refresh/HMR necesitan eval y
//   websockets que este CSP bloquearía.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-src https://embed.windy.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  // Sin esto, React <ViewTransition> (usado en el escudo de club, el logo
  // y el título de campeonato -ver ClubAvatar, CampeonatoCard, etc.) NO
  // funciona: renderiza sin tirar error, pero document.startViewTransition()
  // arranca y nunca termina -la navegación queda colgada un instante y el
  // contenido aparece sin ninguna animación. Confirmado con un repro
  // mínimo fuera de este código (dos páginas con un solo <ViewTransition>
  // entre ellas): sin este flag, la promesa `finished` nunca resuelve; con
  // él, sí. Es la forma en que Next activa el canal "experimental" de
  // React (ver needsExperimentalReact en el propio Next) que esta función
  // de React todavía necesita -Next lo marca "usar con cuidado" porque
  // afecta el runtime de React del sitio entero, no solo estas
  // transiciones puntuales.
  experimental: { gestureTransition: true },
  // Los tests e2e (ver playwright.config.ts) levantan `next dev` y navegan
  // por 127.0.0.1 en vez de localhost -sin esto, Next.js bloquea esas
  // requests de desarrollo (HMR, etc.) por default como protección
  // general, aunque sea la propia máquina.
  allowedDevOrigins: ["127.0.0.1"],
  // AVIF/WebP en vez de solo servir el jpg/png de origen -next/image ya
  // elegía el mejor formato soportado por el navegador, pero declarar
  // explícitamente el orden de preferencia (AVIF primero, más liviano;
  // WebP como respaldo) documenta la intención y evita depender del
  // default implícito del framework.
  images: {
    formats: ["image/avif", "image/webp"],
    // Escudos de clubes y fotos de perfil de regatistas, subidos a Vercel
    // Blob (ver src/lib/upload-imagen.ts) -cada Blob Store público tiene su
    // propio subdominio de *.public.blob.vercel-storage.com.
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
  async headers() {
    return [
      {
        // Todas las rutas -estos headers son generales del sitio, no
        // específicos de una página.
        source: "/(.*)",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: `max-age=${UN_ANIO_EN_SEGUNDOS}; includeSubDomains; preload`,
          },
          // Evita que el navegador "adivine" el tipo de un archivo distinto
          // al Content-Type real que mandó el server (protección contra
          // ataques de MIME-sniffing).
          { key: "X-Content-Type-Options", value: "nosniff" },
          // No permite que el sitio se embeba en un <iframe> de otro
          // dominio (protección básica contra clickjacking).
          { key: "X-Frame-Options", value: "DENY" },
          // Manda el origen completo solo a nuestro propio dominio; a
          // terceros (ej: un link externo) solo el origen, sin path ni
          // query -evita filtrar por accidente una URL con datos (ej: un
          // token de reseteo de contraseña) en el header Referer de un
          // request saliente.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Desactiva APIs de navegador que este sitio no usa -reduce la
          // superficie si algún día se cuela un script de terceros
          // comprometido.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          ...(process.env.NODE_ENV === "production"
            ? [{ key: "Content-Security-Policy", value: CSP }]
            : []),
        ],
      },
      {
        // Todo lo que sirve /admin, /mi-perfil y /vincular es privado -sin
        // esto, un buscador que ignore robots.txt (o un link externo) podría
        // igual indexar esas páginas si alguna vez quedan accesibles sin
        // sesión por un rato. Dos patrones por ruta (con y sin ":path*")
        // porque ese comodín no matchea la ruta exacta sin subpath.
        source: "/:base(admin|mi-perfil|vincular)",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/:base(admin|mi-perfil|vincular)/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
