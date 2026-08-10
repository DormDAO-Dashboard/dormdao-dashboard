"use client";
import { useState } from "react";
import { Play } from "lucide-react";
import { VideoModal } from "@/components/VideoModal";
import { PlaceholderBadge } from "@/components/showcase/PlaceholderNote";

export function VideoCard({
  title,
  description,
  url,
  accentColor,
}: {
  title: string;
  description?: string;
  url: string | null;
  accentColor: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => url && setOpen(true)}
        disabled={!url}
        className="group text-left rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 overflow-hidden w-full disabled:cursor-default"
      >
        <div
          className="aspect-video flex items-center justify-center relative"
          style={{ backgroundColor: `${accentColor}14` }}
        >
          {url ? (
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
              style={{ backgroundColor: accentColor }}
            >
              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
            </div>
          ) : (
            <PlaceholderBadge />
          )}
        </div>
        <div className="p-3.5">
          <div className="text-sm font-medium text-gray-900 dark:text-white">{title}</div>
          {description && <p className="text-xs text-gray-700 dark:text-gray-400 mt-1 leading-relaxed">{description}</p>}
        </div>
      </button>

      {open && url && (
        <VideoModal url={url} title={title} onClose={() => setOpen(false)} autoPlay />
      )}
    </>
  );
}
