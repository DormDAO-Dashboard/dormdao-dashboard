import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <div className="text-6xl font-bold font-mono text-gray-700">404</div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Page not found</h2>
      <p className="text-gray-400 text-sm">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link
        href="/"
        className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors"
      >
        Go home
      </Link>
    </div>
  );
}
