import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Fuerza HTTPS: si el request llegó por HTTP, redirige (301, permanente)
// a la misma URL en HTTPS. En Vercel esto ya no debería pasar casi nunca
// -el proxy de Vercel maneja el TLS y suele redirigir HTTP->HTTPS antes de
// que la request llegue acá-, pero queda como defensa en profundidad para
// cualquier otro hosting, o un proxy intermedio mal configurado. En
// desarrollo local (localhost, sin TLS) no correspondería forzar nada, así
// que se salta si el host es localhost/127.0.0.1.
// Modo mantenimiento: con MODO_MANTENIMIENTO=1 en las variables de entorno,
// TODA la web (páginas, API, admin, login) responde 503 con esta pantalla y
// no toca la base de datos -sirve para migrar o reparar la base sin que
// nadie vea errores ni escriba datos a mitad de camino. 503 + Retry-After le
// avisa a Google que es temporal, así no desindexa nada. Es HTML suelto, sin
// layout ni sesión, justamente para no depender de la base. Los archivos
// estáticos (imágenes, manifest, robots) siguen sirviéndose normal.
const PAGINA_MANTENIMIENTO = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Orzando - En mantenimiento</title>
<style>
:root{color-scheme:light dark;--bg:#f8fafc;--fg:#0f172a;--mut:#475569;--acc:#2563eb}
@media (prefers-color-scheme:dark){:root{--bg:#0b1220;--fg:#e2e8f0;--mut:#94a3b8;--acc:#60a5fa}}
*{box-sizing:border-box}
body{margin:0;min-height:100dvh;display:grid;place-items:center;padding:24px;background:var(--bg);color:var(--fg);font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:30rem;text-align:left}
.marca{font-size:.875rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--acc)}
h1{margin:.75rem 0 1rem;font-size:clamp(1.75rem,6vw,2.5rem);line-height:1.1;letter-spacing:-.02em}
p{margin:0 0 .75rem;color:var(--mut);line-height:1.6;font-size:1.0625rem}
</style>
</head>
<body>
<main>
<div class="marca">Orzando</div>
<h1>Estamos haciendo mantenimiento</h1>
<p>Estamos mejorando el sitio y volvemos en unos minutos. Tus datos y los resultados están a salvo.</p>
<p>Gracias por la paciencia. Probá de nuevo en un rato.</p>
</main>
</body>
</html>`;

function respuestaMantenimiento(pathname: string) {
  const cabeceras = { 'Retry-After': '1800', 'Cache-Control': 'no-store' };
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'El sitio está en mantenimiento. Probá de nuevo en unos minutos.' }, { status: 503, headers: cabeceras });
  }
  return new NextResponse(PAGINA_MANTENIMIENTO, {
    status: 503,
    headers: { ...cabeceras, 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export function proxy(request: NextRequest) {
  if (process.env.MODO_MANTENIMIENTO === '1') {
    const { pathname } = request.nextUrl;
    // Archivos con extensión (imágenes, manifest, robots.txt...) pasan; el
    // sitemap.xml no, porque se arma consultando la base.
    const esArchivo = /\.[a-z0-9]+$/i.test(pathname) && pathname !== '/sitemap.xml';
    if (!esArchivo) return respuestaMantenimiento(pathname);
  }

  const proto = request.headers.get('x-forwarded-proto');
  const host = request.nextUrl.hostname;
  const esLocal = host === 'localhost' || host === '127.0.0.1';

  if (!esLocal && proto === 'http') {
    const url = request.nextUrl.clone();
    url.protocol = 'https:';
    return NextResponse.redirect(url, 301);
  }

  return NextResponse.next();
}

export const config = {
  // Corre en todas las rutas de página, pero no en assets estáticos ni en
  // la carpeta interna de Next -no tiene sentido evaluarlo ahí y evita
  // trabajo de más en cada request de un archivo.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png).*)'],
};
