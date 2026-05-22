import { Skeleton } from "@/components/ui/Card";

export default function Loading() {
  return (
    <div>
      <div className="mb-8">
        <Skeleton className="h-8 w-52 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5 mb-6">
        <Skeleton className="h-4 w-32 mb-3" />
        <Skeleton className="h-24 w-full mb-3" />
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="flex gap-2 mb-6">
        <Skeleton className="h-8 w-14" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
      <div className="flex flex-col gap-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
            <Skeleton className="h-4 w-32 mb-3" />
            <Skeleton className="h-16 w-full mb-3" />
            <Skeleton className="h-3 w-40" />
          </div>
        ))}
      </div>
    </div>
  );
}
