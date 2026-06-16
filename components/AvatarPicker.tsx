"use client";
import { useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { PUDGY_AVATARS } from "@/lib/penguins";
import { cn } from "@/lib/utils";

interface Props {
  current: string | null;
  onSelect: (url: string) => void;
}

export function AvatarPicker({ current, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(current);

  function choose(url: string) {
    setSelected(url);
    onSelect(url);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-primary hover:underline mt-1"
      >
        Choose a Pudgy Penguin avatar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-xl border border-gray-700 bg-gray-900 shadow-2xl flex flex-col max-h-[80vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0">
              <div>
                <h2 className="text-sm font-semibold text-white">Choose your Pudgy</h2>
                <p className="text-xs text-gray-500 mt-0.5">Pick a penguin to represent you across DormDAO.</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Grid */}
            <div className="overflow-y-auto p-4">
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {PUDGY_AVATARS.map(({ id, url, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => choose(url)}
                    title={label}
                    className={cn(
                      "relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:scale-105",
                      selected === url
                        ? "border-primary ring-2 ring-primary/40"
                        : "border-gray-700 hover:border-primary/50"
                    )}
                  >
                    <Image
                      src={url}
                      alt={label}
                      fill
                      className="object-cover"
                      sizes="80px"
                      loading="lazy"
                      unoptimized
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
