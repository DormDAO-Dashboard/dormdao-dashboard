"use client";
import { useState } from "react";
import { ResearchNote } from "@/lib/types";
import { NoteCard } from "@/components/notes/NoteCard";
import { useIsAdmin } from "@/lib/useIsAdmin";
import { schoolDisplayName } from "@/lib/schoolData";

export function SchoolNoteList({
  initialNotes,
  schoolName,
}: {
  initialNotes: ResearchNote[];
  schoolName: string;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const isAdmin = useIsAdmin();

  if (notes.length === 0) {
    return (
      <div className="text-center py-8 text-gray-700 dark:text-gray-400 text-sm">
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
          isAdmin={isAdmin}
          onDelete={(id) => setNotes((prev) => prev.filter((n) => n.id !== id))}
        />
      ))}
    </div>
  );
}
