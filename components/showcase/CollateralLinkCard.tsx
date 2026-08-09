import { ExternalLink } from "lucide-react";
import { PlaceholderBadge } from "@/components/showcase/PlaceholderNote";

export function CollateralLinkCard({
  title,
  description,
  url,
  icon: Icon,
  accentColor,
}: {
  title: string;
  description?: string;
  url: string | null;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
}) {
  const content = (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-4 h-full flex flex-col gap-2 transition-colors group-hover:border-current">
      <div className="flex items-center justify-between gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${accentColor}1A`, color: accentColor }}>
          <Icon className="w-4 h-4" />
        </div>
        {url ? (
          <ExternalLink className="w-3.5 h-3.5 text-gray-700 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        ) : (
          <PlaceholderBadge />
        )}
      </div>
      <div className="text-sm font-medium text-gray-900 dark:text-white">{title}</div>
      {description && <p className="text-xs text-gray-700 dark:text-gray-400 leading-relaxed">{description}</p>}
    </div>
  );

  if (!url) return <div className="group" style={{ color: accentColor }}>{content}</div>;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block"
      style={{ color: accentColor }}
    >
      {content}
    </a>
  );
}
