import { Skeleton } from "@/components/ui/Card";

export default function Loading() {
  return (
    <div>
      <Skeleton className="h-4 w-24 mb-6" />
      <div className="mb-8">
        <Skeleton className="h-3 w-16 mb-2" />
        <Skeleton className="h-9 w-56" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-7 w-24" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-800">
          <Skeleton className="h-4 w-36" />
        </div>
        <div className="p-4 flex flex-col gap-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
