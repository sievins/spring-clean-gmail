import { Skeleton } from "@/components/ui/skeleton";

export function EmailSkeleton() {
  return (
    <div className="flex h-[41px] items-center gap-3 border-b px-[12px]">
      <Skeleton className="h-4 w-4 rounded" />
      <div className="flex h-6 min-w-0 flex-1 items-center gap-2">
        <Skeleton className="h-4 w-40 shrink-0" />
        <Skeleton className="h-4 w-48 shrink-0" />
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-4 w-12 shrink-0" />
      </div>
    </div>
  );
}

export function EmailListSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="space-y-4" role="status" aria-label="Loading emails">
      <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3 h-[46px]">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div>
        {Array.from({ length: count }).map((_, i) => (
          <EmailSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
