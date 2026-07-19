import { Skeleton } from "@/components/ui/Card";

export default function Loading() {
  return (
    <>
      <div className="mb-6">
        <Skeleton className="h-8 w-72 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-5">
            <Skeleton className="h-3 w-24 mb-3" />
            <Skeleton className="h-8 w-32" />
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-5">
            <Skeleton className="h-3 w-40 mb-4" />
            <Skeleton className="h-64 w-full" />
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-5">
            <Skeleton className="h-3 w-40 mb-4" />
            <Skeleton className="h-48 w-full" />
          </div>
        ))}
      </div>
    </>
  );
}
