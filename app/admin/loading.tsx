import { Skeleton } from "@/components/ui/Card";

export default function Loading() {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="h-8 w-36 mb-2" />
      </div>
      <div className="flex gap-2 mb-6">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-28 rounded-full" />
        ))}
      </div>
      <div className="rounded-lg border border-gray-800 bg-gray-900/30 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="p-4 flex flex-col gap-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
