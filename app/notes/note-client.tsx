'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import { LoadingBar } from "@/components/ui/loading-bar";
import { SerializedEditorState } from "lexical";
import {
  getNote,
  updateNote,
  type Note,
} from "./note-actions";
import { Editor } from "@/components/blocks/editor-00/editor";

interface NoteClientProps {
  noteId?: string | null;
  initialNote?: Note | null;
  onNoteActivity?: (noteId: string, title: string) => void;
}

function parseNoteContent(content?: string): SerializedEditorState | undefined {
  if (!content) return undefined;

  try {
    const parsed = JSON.parse(content) as { root?: unknown };
    if (parsed?.root) return parsed as SerializedEditorState;
  } catch {
    // AI-created notes may contain markdown/plain text instead of editor JSON.
  }

  return {
    root: {
      children: content.split(/\r?\n/).map((text) => ({
        children: text
          ? [{ detail: 0, format: 0, mode: "normal", style: "", text, type: "text", version: 1 }]
          : [],
        direction: "ltr",
        format: "",
        indent: 0,
        type: "paragraph",
        version: 1,
      })),
      direction: "ltr",
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
  } as SerializedEditorState;
}

export function NoteClient({ noteId, initialNote, onNoteActivity }: NoteClientProps) {
  const isInitialNote = Boolean(initialNote && noteId && initialNote.id === noteId);
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(noteId ?? null);
  const [title, setTitle] = useState(isInitialNote && initialNote ? initialNote.title : "");
  const [editorState, setEditorState] = useState<SerializedEditorState | undefined>(() =>
    isInitialNote ? parseNoteContent(initialNote?.content) : undefined
  );
  const [loading, setLoading] = useState(false);
  const [showLoadingBar, setShowLoadingBar] = useState(false);
  const [editorKey, setEditorKey] = useState(0);

  const titleRef = useRef<HTMLInputElement>(null);
  const titleSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeNoteIdRef = useRef<string | null>(noteId ?? null);
  const noteRequestRef = useRef<{ noteId: string; promise: Promise<Note> } | null>(
    isInitialNote && initialNote ? { noteId: initialNote.id, promise: Promise.resolve(initialNote) } : null
  );

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
    const activeNoteId = noteId ?? null;
    activeNoteIdRef.current = activeNoteId;
    setCurrentNoteId(activeNoteId);

    if (activeNoteId) {
      // React replays mount effects in development. Reuse the existing request
      // so viewing a note does not issue a second server action request.
      if (noteRequestRef.current?.noteId === activeNoteId) return;

      setLoading(true);
      const request = getNote(activeNoteId);
      noteRequestRef.current = { noteId: activeNoteId, promise: request };
      request
        .then((note: Note) => {
          if (activeNoteIdRef.current !== activeNoteId) return;
          setTitle(note.title);
          setEditorState(parseNoteContent(note.content));
          setEditorKey(prev => prev + 1);
          setLoading(false);
        })
        .catch(() => {
          if (activeNoteIdRef.current === activeNoteId) setLoading(false);
        });
    } else {
      noteRequestRef.current = null;
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
        {showLoadingBar && <LoadingBar />}
        <div className="flex-1 overflow-y-auto scrollbar-thin pt-4 sm:pt-8 md:pt-12 pb-0 flex flex-col scrollbar-gutter-stable">
          <div className="px-5 sm:px-6 md:px-8 pb-12 flex-1">
            <div className="w-full max-w-3xl mx-auto sm:px-4">
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto scrollbar-thin pt-4 sm:pt-8 md:pt-12 pb-0 flex flex-col scrollbar-gutter-stable">
        <div className="px-5 sm:px-6 md:px-8 pb-12 flex-1">
          <div className="w-full max-w-3xl mx-auto space-y-4 sm:px-4">
            <input
              ref={titleRef}
              type="text"
              maxLength={50}
              placeholder="New note"
              value={title}
              onChange={handleTitleChange}
              className="ml-2 sm:ml-4 w-full bg-transparent text-2xl sm:text-3xl font-semibold outline-none placeholder:text-muted-foreground/50"
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
    </div>
  );
}
