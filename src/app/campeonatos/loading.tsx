import { Skeleton } from "@/components/ui/skeleton";

// Esqueleto con la forma de la lista de campeonatos (título, filtros y
// grilla de tarjetas): mientras carga, la página no queda en blanco.
export default function Loading() {
  return (
    <main className="min-h-dvh bg-background text-foreground p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <Skeleton className="h-10 w-96 max-w-full mb-3" />
          <Skeleton className="h-5 w-80 max-w-full" />
        </div>
        <div className="bg-surface border border-border rounded-xl p-6 flex flex-col sm:flex-row gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-surface p-5 space-y-5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-28" />
                <Skeleton className="h-5 w-10" />
              </div>
              <Skeleton className="h-6 w-4/5" />
              <div className="space-y-2 pt-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
