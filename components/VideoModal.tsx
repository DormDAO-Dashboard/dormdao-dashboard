"use client";
import { X } from "lucide-react";

function toEmbedUrl(url: string): string | null {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  const loomMatch = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
  if (loomMatch) return `https://www.loom.com/embed/${loomMatch[1]}`;
  return null;
}

export function VideoModal({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  const embedUrl = toEmbedUrl(url);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="relative w-full max-w-4xl mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">{title}</h3>
          <button
            onClick={onClose}
            className="shrink-0 ml-3 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4 text-gray-300" />
          </button>
        </div>
        {embedUrl ? (
          <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
            <iframe
              src={embedUrl}
              className="absolute inset-0 w-full h-full"
              allowFullScreen
              allow="autoplay; encrypted-media"
            />
          </div>
        ) : (
          <div className="aspect-video flex items-center justify-center bg-gray-900 rounded-xl">
            <p className="text-gray-500 text-sm">Unable to embed this video URL.</p>
          </div>
        )}
      </div>
    </div>
  );
}
