import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Fuerza HTTPS: si el request llegó por HTTP, redirige (301, permanente)
// a la misma URL en HTTPS. En Vercel esto ya no debería pasar casi nunca
// -el proxy de Vercel maneja el TLS y suele redirigir HTTP->HTTPS antes de
// que la request llegue acá-, pero queda como defensa en profundidad para
// cualquier otro hosting, o un proxy intermedio mal configurado. En
// desarrollo local (localhost, sin TLS) no correspondería forzar nada, así
// que se salta si el host es localhost/127.0.0.1.
export function proxy(request: NextRequest) {
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
