import { Metadata } from "next";
import { CambiarCookiesButton } from "@/components/layout/cambiar-cookies-button";

export const metadata: Metadata = {
  title: "Aviso de cookies",
  description: "Qué cookies usa Orzando y para qué sirve cada una.",
};

export default function CookiesPage() {
  return (
    <main className="min-h-dvh bg-background">
      <div className="max-w-3xl mx-auto px-6 py-16 space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Aviso de cookies</h1>
          <p className="text-sm text-muted-foreground">Última actualización: septiembre de 2026</p>
        </header>

        <section className="space-y-3 text-foreground/90">
          <p>
            Orzando usa tres categorías de cookies: las necesarias para
            que el sitio funcione (siempre activas), y las de analítica y
            publicidad (opcionales, solo si las aceptás). Podés elegir cuáles
            aceptar desde el aviso que aparece al entrar, o cambiar tu
            elección en cualquier momento con el botón al final de esta
            página.
          </p>
        </section>

        <section className="space-y-3 text-foreground/90">
          <h2 className="text-xl font-semibold">Necesarias (siempre activas)</h2>
          <p className="text-sm text-muted-foreground">
            No piden consentimiento porque, sin ellas, el servicio que
            pediste (iniciar sesión) directamente no funciona.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-surface-hover text-left">
                <tr>
                  <th scope="col" className="p-3 font-semibold">Cookie</th>
                  <th scope="col" className="p-3 font-semibold">Finalidad</th>
                  <th scope="col" className="p-3 font-semibold">Duración</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="p-3 font-mono text-xs">authjs.session-token</td>
                  <td className="p-3">Mantiene tu sesión iniciada. Sin ella no podrías permanecer logueado entre una página y otra.</td>
                  <td className="p-3">30 días o hasta que cierres sesión</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-xs">authjs.csrf-token</td>
                  <td className="p-3">Protege los formularios de inicio de sesión contra ataques de falsificación de solicitud (CSRF).</td>
                  <td className="p-3">Duración de la sesión del navegador</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3 text-foreground/90">
          <h2 className="text-xl font-semibold">Analítica (opcional)</h2>
          <p>
            Todavía no cargamos ninguna herramienta de analítica en el
            sitio. Cuando lo hagamos (para saber qué páginas se visitan más
            y mejorar el sitio), va a ser Google Analytics, y solo se va a
            activar si elegís aceptar esta categoría -mientras no la
            aceptes, no se carga ni deja ninguna cookie.
          </p>
        </section>

        <section className="space-y-3 text-foreground/90">
          <h2 className="text-xl font-semibold">Publicidad (opcional)</h2>
          <p>
            Todavía no mostramos publicidad en el sitio. Cuando la sumemos
            (para sostener el sitio sin cobrar por el acceso), va a ser a
            través de Google, y de la misma forma que la analítica: solo se
            activa si aceptás esta categoría. Los anuncios de Google pueden
            usar cookies para no repetirte siempre el mismo aviso y, si lo
            permitís, para mostrarte anuncios más relevantes -podés leer
            cómo Google usa esos datos en su{" "}
            <a
              href="https://policies.google.com/technologies/partner-sites"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              política de cookies para sitios asociados
            </a>
            .
          </p>
        </section>

        <section className="space-y-3 text-foreground/90">
          <h2 className="text-xl font-semibold">Lo que NO es una cookie, aunque se le parezca</h2>
          <p>
            Tu preferencia de tema claro/oscuro y qué cookies elegiste se
            guardan con <code className="text-xs bg-surface-hover px-1.5 py-0.5 rounded">localStorage</code> del
            navegador, no con una cookie -ese dato nunca viaja al servidor en
            cada request, se queda únicamente en tu navegador y podés
            borrarlo cuando quieras desde su configuración.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">Cambiar tu elección</h2>
          <p className="text-foreground/90">
            Podés aceptar o rechazar cada categoría opcional de nuevo cuando
            quieras.
          </p>
          <CambiarCookiesButton />
        </section>
      </div>
    </main>
  );
}
