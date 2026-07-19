import { Skeleton } from "@/components/ui/Card";

export default function Loading() {
  return (
    <div>
      <Skeleton className="h-4 w-28 mb-6" />
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-6 mb-6">
        <Skeleton className="h-3 w-24 mb-2" />
        <Skeleton className="h-10 w-32 mb-4" />
        <Skeleton className="h-8 w-40 mb-2" />
        <Skeleton className="h-4 w-24 mb-6" />
        <Skeleton className="h-48 w-full" />
      </div>
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-5 mb-6">
        <Skeleton className="h-4 w-28 mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i}>
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-5 w-24" />
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-800">
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="p-4 flex flex-col gap-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
