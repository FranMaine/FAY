import { Skeleton, SkeletonTableRow } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <Skeleton className="h-10 w-80 max-w-full mb-3" />
          <Skeleton className="h-5 w-64 max-w-full" />
        </div>
        <div className="bg-surface border border-border rounded-xl p-6 flex flex-col sm:flex-row gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <table className="w-full">
            <tbody>
              {Array.from({ length: 10 }).map((_, i) => (
                <SkeletonTableRow key={i} columnas={4} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
