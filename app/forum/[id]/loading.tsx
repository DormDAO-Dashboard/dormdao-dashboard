import { Skeleton } from "@/components/ui/Card";

export default function Loading() {
  return (
    <div>
      <Skeleton className="h-4 w-24 mb-6" />
      <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-6 mb-6">
        <Skeleton className="h-7 w-3/4 mb-3" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-5/6 mb-4" />
        <div className="flex gap-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="flex flex-col gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg border border-gray-800 bg-gray-900/30 p-4">
            <Skeleton className="h-3 w-32 mb-3" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
