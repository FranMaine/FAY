import { Skeleton } from "@/components/ui/skeleton";

// Esqueleto de la lista de clubes (título, buscador y grilla de tarjetas).
export default function Loading() {
  return (
    <main className="min-h-dvh bg-background text-foreground p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <Skeleton className="h-10 w-48 max-w-full mb-3" />
          <Skeleton className="h-5 w-72 max-w-full" />
        </div>
        <Skeleton className="h-12 w-full max-w-md" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4">
              <Skeleton className="h-14 w-14 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-40 max-w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
