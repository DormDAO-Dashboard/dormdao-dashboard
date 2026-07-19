"use client";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <div className="w-12 h-12 rounded-xl bg-danger/20 flex items-center justify-center">
        <AlertTriangle className="w-6 h-6 text-danger" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Something went wrong</h2>
      <p className="text-gray-400 text-sm text-center max-w-sm">
        {error.message || "An unexpected error occurred"}
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
