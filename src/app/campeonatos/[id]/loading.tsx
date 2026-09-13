import { Skeleton, SkeletonTableRow } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="bg-surface border-b border-border px-6 py-10">
        <div className="max-w-5xl mx-auto space-y-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-10 w-2/3 max-w-full" />
          <Skeleton className="h-5 w-1/3" />
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="hidden md:block overflow-hidden rounded-xl border border-border bg-surface">
          <table className="w-full">
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonTableRow key={i} columnas={7} />
              ))}
            </tbody>
          </table>
        </div>
        <div className="md:hidden space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </main>
  );
}
