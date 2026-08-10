export function ShowcaseSection({
  title,
  accentColor,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  accentColor: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`mb-12 ${className}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="w-1 h-5 rounded-full shrink-0" style={{ backgroundColor: accentColor }} />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
      </div>
      {subtitle && <p className="text-sm text-gray-700 dark:text-gray-400 mb-5 ml-3.5">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}
