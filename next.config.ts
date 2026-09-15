import type { NextConfig } from "next";

// Un año en segundos, para el header HSTS (Strict-Transport-Security):
// le dice al navegador "de acá a un año, no vuelvas a intentar este sitio
// por HTTP ni una sola vez, andá directo a HTTPS" -sin esto, la primera
// visita de cada usuario (o cualquiera que escriba/pegue el link sin
// "https://") pasa por un redirect 307 en vez de ir directo a la versión
// segura.
const UN_ANIO_EN_SEGUNDOS = 60 * 60 * 24 * 365;

const nextConfig: NextConfig = {
  // AVIF/WebP en vez de solo servir el jpg/png de origen -next/image ya
  // elegía el mejor formato soportado por el navegador, pero declarar
  // explícitamente el orden de preferencia (AVIF primero, más liviano;
  // WebP como respaldo) documenta la intención y evita depender del
  // default implícito del framework.
  images: {
    formats: ["image/avif", "image/webp"],
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
