import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aviso de cookies",
  description: "Qué cookies usa FAY Stats y para qué sirve cada una.",
};

export default function CookiesPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-16 space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Aviso de cookies</h1>
          <p className="text-sm text-muted-foreground">Última actualización: {new Date().toLocaleDateString("es-AR", { year: "numeric", month: "long" })}</p>
        </header>

        <section className="space-y-3 text-foreground/90">
          <p>
            FAY Stats usa una cantidad mínima de cookies: solo las
            estrictamente necesarias para que el inicio de sesión funcione.
            No usamos cookies de analítica ni de publicidad de terceros.
          </p>
        </section>

        <section className="space-y-3 text-foreground/90">
          <h2 className="text-xl font-semibold">Cookies que usamos</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-surface-hover text-left">
                <tr>
                  <th className="p-3 font-semibold">Cookie</th>
                  <th className="p-3 font-semibold">Finalidad</th>
                  <th className="p-3 font-semibold">Duración</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="p-3 font-mono text-xs">authjs.session-token</td>
                  <td className="p-3">Mantiene tu sesión iniciada. Es estrictamente necesaria: sin ella no podrías permanecer logueado entre una página y otra.</td>
                  <td className="p-3">30 días o hasta que cierres sesión</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-xs">authjs.csrf-token</td>
                  <td className="p-3">Protege los formularios de inicio de sesión contra ataques de falsificación de solicitud (CSRF). Estrictamente necesaria.</td>
                  <td className="p-3">Duración de la sesión del navegador</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3 text-foreground/90">
          <h2 className="text-xl font-semibold">Lo que NO es una cookie, aunque se le parezca</h2>
          <p>
            Tu preferencia de tema claro/oscuro y si ya viste este aviso se
            guardan con <code className="text-xs bg-surface-hover px-1.5 py-0.5 rounded">localStorage</code> del
            navegador, no con cookies -ese dato nunca viaja al servidor en
            cada request, se queda únicamente en tu navegador y podés
            borrarlo cuando quieras desde la configuración del propio
            navegador.
          </p>
        </section>

        <section className="space-y-3 text-foreground/90">
          <h2 className="text-xl font-semibold">Cómo desactivarlas</h2>
          <p>
            Como las únicas cookies que usamos son estrictamente necesarias
            para el login, no ofrecemos un panel de &quot;rechazar cookies&quot; -si
            las bloqueás desde la configuración de tu navegador, vas a poder
            seguir viendo todo el contenido público del sitio, pero no vas a
            poder iniciar sesión.
          </p>
        </section>
      </div>
    </main>
  );
}
