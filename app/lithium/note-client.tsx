'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import {
  getNote,
  updateNoteTitle,
  updateNoteContent,
  type Note,
} from "./note-actions";
import { Spinner } from "@/components/ui/spinner";

interface NoteClientProps {
  noteId?: string | null;
  onNoteCreated?: (noteId: string, title: string) => void;
  onNoteActivity?: (noteId: string, title: string) => void;
}

export function NoteClient({ noteId, onNoteActivity }: NoteClientProps) {
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(noteId ?? null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load note when noteId changes
  useEffect(() => {
    setCurrentNoteId(noteId ?? null);
    if (noteId) {
      setLoading(true);
      getNote(noteId)
        .then((note: Note) => {
          setTitle(note.title);
          setContent(note.content);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    } else {
      setTitle("");
      setContent("");
    }
  }, [noteId]);

  const debouncedSave = useCallback(
    (field: "title" | "content", value: string, nId: string) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        if (field === "title") {
          await updateNoteTitle(nId, value);
          onNoteActivity?.(nId, value);
        } else {
          await updateNoteContent(nId, value);
        }
      }, 500);
    },
    [onNoteActivity]
  );

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (currentNoteId) debouncedSave("title", newTitle, currentNoteId);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    if (currentNoteId) debouncedSave("content", newContent, currentNoteId);
  };

  // Auto-resize textarea
  useEffect(() => {
    const textarea = contentRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = textarea.scrollHeight + "px";
    }
  }, [content]);

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-8 pt-12">
          <div className="w-full max-w-3xl mx-auto">
            <p className="p-4 text-muted-foreground italic flex items-center gap-2">
              <Spinner /> Loading history...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-8 pt-12">
        <div className="w-full max-w-3xl mx-auto space-y-4">
          <input
            ref={titleRef}
            type="text"
            placeholder="New note"
            value={title}
            onChange={handleTitleChange}
            className="w-full bg-transparent text-3xl font-bold outline-none placeholder:text-muted-foreground/50"
          />
          <textarea
            ref={contentRef}
            placeholder="Start writing..."
            value={content}
            onChange={handleContentChange}
            className="w-full min-h-[60vh] resize-none bg-transparent text-base leading-relaxed outline-none placeholder:text-muted-foreground/50"
          />
        </div>
      </div>
    </div>
  );
}
