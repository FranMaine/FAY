import { Skeleton } from "@/components/ui/skeleton";

// Next.js muestra esto automáticamente mientras se resuelve el Server
// Component de la ruta -acá, la home (que hace 2 queries a la base en
// cada visita por ser force-dynamic). Sin loading.tsx, esa espera se veía
// como una pantalla en blanco.
export default function Loading() {
  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      <section className="px-6 py-20 md:py-32 flex flex-col items-center text-center">
        <Skeleton className="h-16 w-16 rounded-full mb-6" />
        <Skeleton className="h-12 w-64 mb-4" />
        <Skeleton className="h-6 w-96 max-w-full mb-8" />
        <Skeleton className="h-14 w-full max-w-2xl rounded-full" />
      </section>
      <section className="border-y border-border bg-surface/50 py-10 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <Skeleton className="h-9 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
