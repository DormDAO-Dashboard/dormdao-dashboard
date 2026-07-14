"use client";
import { useEffect, useState } from "react";
import { ResearchNote } from "@/lib/types";
import { NoteCard } from "@/components/notes/NoteCard";
import { ADMIN_SECRET } from "@/lib/admin";
import { schoolDisplayName } from "@/lib/schoolData";

export function SchoolNoteList({
  initialNotes,
  schoolName,
}: {
  initialNotes: ResearchNote[];
  schoolName: string;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [adminSecret, setAdminSecret] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("admin")) setAdminSecret(ADMIN_SECRET);
  }, []);

  if (notes.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        No research notes yet for {schoolDisplayName(schoolName)}. Be the first to add one!
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          adminSecret={adminSecret}
          onDelete={(id) => setNotes((prev) => prev.filter((n) => n.id !== id))}
        />
      ))}
    </div>
  );
}
