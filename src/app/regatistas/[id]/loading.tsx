import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="min-h-screen bg-background text-foreground pb-20">
      <div className="bg-surface border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <Skeleton className="h-8 w-32 mb-6" />
          <div className="flex items-center gap-6">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="space-y-3">
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-5 w-40" />
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <Skeleton className="h-80 w-full rounded-xl" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </main>
  );
}
