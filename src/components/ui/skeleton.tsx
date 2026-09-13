import { cn } from "@/lib/utils";

// Bloque base para armar skeletons -un rectángulo gris que pulsa, del
// tamaño que le pases por className (ej: "h-4 w-32", "h-40 w-full").
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-surface-hover", className)} />;
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
      <div className="flex justify-between items-start">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
      <Skeleton className="h-5 w-4/5" />
      <Skeleton className="h-4 w-1/3" />
      <div className="space-y-2 pt-2">
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

export function SkeletonTableRow({ columnas = 6 }: { columnas?: number }) {
  return (
    <tr className="border-b border-border">
      {Array.from({ length: columnas }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}
