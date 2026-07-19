import { Skeleton } from "@/components/ui/Card";

export default function Loading() {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="h-8 w-28 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex gap-2 mb-6">
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <Skeleton className="h-3 w-20 mb-1.5" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-4 w-4" />
            </div>
            <Skeleton className="h-6 w-24 mb-1" />
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-3 w-20 mb-2" />
            <div className="flex gap-1">
              <Skeleton className="h-5 w-9" />
              <Skeleton className="h-5 w-9" />
              <Skeleton className="h-5 w-9" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
