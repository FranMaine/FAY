import { SailingBoat } from "@/components/icons/sailing-boat";

// Marco compartido de login / registro / recuperar contraseña: en pantallas
// anchas, el velero de la marca a la izquierda con la promesa del sitio, y el
// formulario a la derecha; en angostas, solo el formulario (la foto no
// aporta nada ahí y le come espacio útil).
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background grid lg:grid-cols-2">
      <aside className="relative hidden lg:flex flex-col justify-end overflow-hidden p-12 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-700 via-blue-800 to-slate-900" aria-hidden="true" />
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_65%_35%,rgba(96,165,250,0.35),transparent_60%)]"
          aria-hidden="true"
        />
        <SailingBoat
          className="absolute right-[-6%] top-[12%] h-[62%] w-auto text-white/[0.09]"
          aria-hidden="true"
        />
        <div className="relative max-w-md space-y-3">
          <p className="text-4xl font-extrabold leading-tight tracking-tight [text-shadow:0_2px_20px_rgba(0,0,0,0.6)]">
            Tu historial de regatas, en un solo lugar.
          </p>
          <p className="text-white/80">Resultados, rankings y estadísticas de la vela argentina.</p>
        </div>
      </aside>

      <section className="flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">{children}</div>
      </section>
    </main>
  );
}
