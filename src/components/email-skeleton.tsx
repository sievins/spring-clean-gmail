import { Skeleton } from "@/components/ui/skeleton";

export function EmailSkeleton() {
  return (
    <div className="flex items-start gap-4 rounded-lg border p-4">
      <Skeleton className="h-4 w-4 rounded" />

      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

export function EmailListSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="space-y-2" role="status" aria-label="Loading emails">
      {Array.from({ length: count }).map((_, i) => (
        <EmailSkeleton key={i} />
      ))}
    </div>
  );
}
