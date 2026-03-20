'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import { SerializedEditorState } from "lexical";
import {
  getNote,
  updateNote,
  type Note,
} from "./note-actions";
import { Editor } from "@/components/blocks/editor-00/editor";

interface NoteClientProps {
  noteId?: string | null;
  onNoteCreated?: (noteId: string, title: string) => void;
  onNoteActivity?: (noteId: string, title: string) => void;
}

export function NoteClient({ noteId, onNoteActivity }: NoteClientProps) {
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(noteId ?? null);
  const [title, setTitle] = useState("");
  const [editorState, setEditorState] = useState<SerializedEditorState | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [showLoadingBar, setShowLoadingBar] = useState(false);
  const [editorKey, setEditorKey] = useState(0);

  const titleRef = useRef<HTMLInputElement>(null);
  const titleSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (loading) {
      timer = setTimeout(() => setShowLoadingBar(true), 250);
    } else {
      setShowLoadingBar(false);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  // Load note when noteId changes
  useEffect(() => {
    setCurrentNoteId(noteId ?? null);
    if (noteId) {
      setLoading(true);
      getNote(noteId)
        .then((note: Note) => {
          setTitle(note.title);
          try {
            setEditorState(note.content ? JSON.parse(note.content) : undefined);
          } catch {
            setEditorState(undefined);
          }
          setEditorKey(prev => prev + 1);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    } else {
      setTitle("");
      setEditorState(undefined);
      setEditorKey(prev => prev + 1);
    }
  }, [noteId]);

  const debouncedSave = useCallback(
    (field: "title" | "content", value: string, nId: string) => {
      const timerRef = field === "title" ? titleSaveTimerRef : contentSaveTimerRef;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        if (field === "title") {
          await updateNote(nId, { title: value });
          onNoteActivity?.(nId, value);
        } else {
          await updateNote(nId, { content: value });
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

  const handleSerializedChange = useCallback((serialized: SerializedEditorState) => {
    const json = JSON.stringify(serialized);
    if (currentNoteId) debouncedSave("content", json, currentNoteId);
  }, [currentNoteId, debouncedSave]);

  if (loading) {
    return (
      <div className="flex flex-col h-full relative">
        {showLoadingBar && (
          <>
            <style>{`
              @keyframes loadingBar {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(200%); }
              }
              .animate-loading-bar {
                animation: loadingBar 1.5s infinite linear;
              }
            `}</style>
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-primary/20 overflow-hidden z-50">
              <div className="h-full bg-primary w-1/2 animate-loading-bar" />
            </div>
          </>
        )}
        <div className="flex-1 overflow-y-auto p-8 pt-12">
          <div className="w-full max-w-3xl mx-auto">
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
            className="ml-4 w-full bg-transparent text-3xl font-semibold outline-none placeholder:text-muted-foreground/50"
          />
          <Editor
            key={editorKey}
            editorSerializedState={editorState}
            onSerializedChange={handleSerializedChange}
            className="bg-transparent"
          />
        </div>
      </div>
    </div>
  );
}
