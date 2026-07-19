import { Skeleton } from "@/components/ui/Card";

export default function Loading() {
  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <Skeleton className="h-16 w-16 rounded-full flex-shrink-0" />
        <div>
          <Skeleton className="h-6 w-40 mb-2" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="grid gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-4">
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}
