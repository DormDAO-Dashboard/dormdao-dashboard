"use client";
import { useEffect, useState } from "react";
import { ResearchNote } from "@/lib/types";
import { NoteCard } from "@/components/notes/NoteCard";

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
    const params = new URLSearchParams(window.location.search);
    if (params.get("admin") === "true") setAdminSecret(params.get("secret") ?? "");
  }, []);

  if (notes.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        No research notes yet for {schoolName}. Be the first to add one!
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
