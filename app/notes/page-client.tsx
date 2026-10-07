'use client';

import { useState, useEffect, useCallback, useRef } from "react";
import { NotebookPen } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { NoteClient } from "./note-client";
import { listNotes, deleteNote, deleteAllNotes, createNote, togglePinNote, type Note } from "./note-actions";
import type { UserProfile } from "@/lib/profile";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sortByPinned<T extends { is_pinned: boolean; updated_at: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
}

interface PageClientProps {
  user: UserProfile;
  signout?: () => Promise<void>;
  initialNotes?: Note[];
  initialActiveNote?: Note | null;
}

export function PageClient({ user, signout, initialNotes, initialActiveNote }: PageClientProps) {
  const [profile, setProfile] = useState(user);
  const [notes, setNotes] = useState<Note[]>(initialNotes ?? []);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(
    initialNotes && initialNotes.length > 0 ? initialNotes[0].id : null
  );
  const [noteTitle, setNoteTitle] = useState(
    initialNotes && initialNotes.length > 0 ? (initialNotes[0].title || "New note") : "Notes"
  );
  const [isLoading, setIsLoading] = useState(initialNotes === undefined);
  const [initialNote, setInitialNote] = useState<Note | null>(initialActiveNote ?? null);

  const initialLoadStartedRef = useRef(false);

  // Load notes on mount if not provided from server
  useEffect(() => {
    if (initialNotes !== undefined) return;
    if (initialLoadStartedRef.current) return;
    initialLoadStartedRef.current = true;

    listNotes()
      .then(async (loadedNotes) => {
        if (loadedNotes.length > 0) {
          setNotes(loadedNotes);
          setActiveNoteId(loadedNotes[0].id);
          setNoteTitle(loadedNotes[0].title || "New note");
        } else {
          setNotes([]);
          setActiveNoteId(null);
          setNoteTitle("Notes");
        }
      })
      .catch(console.error)
      .finally(() => {
        setIsLoading(false);
      });
  }, [initialNotes]);

  // Sync if initialNotes prop changes (e.g. navigation)
  useEffect(() => {
    if (initialNotes !== undefined) {
      setNotes(initialNotes);
      if (initialNotes.length > 0) {
        setActiveNoteId(prev => (prev && initialNotes.some(n => n.id === prev) ? prev : initialNotes[0].id));
        setNoteTitle(prev => {
          if (prev && prev !== "Notes") return prev;
          return initialNotes[0].title || "New note";
        });
      } else {
        setActiveNoteId(null);
        setNoteTitle("Notes");
      }
      setIsLoading(false);
    }
  }, [initialNotes]);

  // Sync profile when updated from mini app header settings
  useEffect(() => {
    const handleProfileSync = (e: Event) => {
      const customEvent = e as CustomEvent<UserProfile>;
      if (customEvent.detail) {
        setProfile(customEvent.detail);
      }
    };
    window.addEventListener("skyelements:profile-updated", handleProfileSync);
    return () => window.removeEventListener("skyelements:profile-updated", handleProfileSync);
  }, []);

  // Listen for notes cleared event from settings dialog
  useEffect(() => {
    const handleNotesCleared = () => {
      setNotes([]);
      setActiveNoteId(null);
      setNoteTitle("Notes");
      setInitialNote(null);
    };
    window.addEventListener("skyelements:notes-cleared", handleNotesCleared);
    return () => window.removeEventListener("skyelements:notes-cleared", handleNotesCleared);
  }, []);

  // --- Note handlers ---

  const handleNewNote = useCallback(async () => {
    try {
      setInitialNote(null);
      const note = await createNote();
      const now = new Date().toISOString();
      setNotes(prev => sortByPinned([
        { id: note.id, title: note.title, content: '', user_id: '', is_pinned: false, created_at: now, updated_at: now } as Note,
        ...prev,
      ]));
      setActiveNoteId(note.id);
      setNoteTitle(note.title || 'New note');
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  }, []);

  const handleSelectNote = useCallback((noteId: string) => {
    setInitialNote(null);
    setActiveNoteId(noteId);
    setNotes(prev => {
      const note = prev.find(n => n.id === noteId);
      setNoteTitle(note?.title || "New note");
      return prev;
    });
  }, []);

  const handleNoteActivity = useCallback((noteId: string, title: string) => {
    setNotes(prev => sortByPinned(
      prev.map(n => n.id === noteId ? { ...n, title, updated_at: new Date().toISOString() } : n)
    ));
    setNoteTitle(title || 'New note');
  }, []);

  const handleTogglePinNote = useCallback(async (noteId: string, currentPinStatus: boolean) => {
    const newPinStatus = !currentPinStatus;
    // Optimistic update — flip pin state immediately without touching updated_at
    setNotes(prev => sortByPinned(prev.map(n => n.id === noteId ? { ...n, is_pinned: newPinStatus } : n)));
    try {
      await togglePinNote(noteId, newPinStatus);
    } catch (error) {
      console.error('Failed to toggle pin on note:', error);
      // Roll back on failure
      setNotes(prev => sortByPinned(prev.map(n => n.id === noteId ? { ...n, is_pinned: currentPinStatus } : n)));
    }
  }, []);

  const handleDeleteNote = useCallback(async (noteId: string) => {
    try {
      setInitialNote(null);
      await deleteNote(noteId);
      const remaining = notes.filter(n => n.id !== noteId);
      if (remaining.length > 0) {
        setNotes(remaining);
        if (activeNoteId === noteId) {
          setActiveNoteId(remaining[0].id);
          setNoteTitle(remaining[0].title || "New note");
        }
      } else {
        // Last note was deleted; show empty state
        setNotes([]);
        setActiveNoteId(null);
        setNoteTitle("Notes");
      }
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  }, [activeNoteId, notes]);

  const handleDeleteAllNotes = useCallback(async () => {
    try {
      setInitialNote(null);
      await deleteAllNotes();
      // Show empty state
      setNotes([]);
      setActiveNoteId(null);
      setNoteTitle("Notes");
    } catch (error) {
      console.error('Failed to delete all notes:', error);
    }
  }, []);

  return (
    <div className="h-full w-full overflow-hidden flex flex-col flex-1 min-h-0">
      <SidebarProvider className="h-full w-full overflow-hidden">
        <AppSidebar
          user={profile}
          onProfileUpdated={setProfile}
          signout={signout}
          notes={notes}
          activeNoteId={activeNoteId}
          onSelectNote={handleSelectNote}
          onDeleteNote={handleDeleteNote}
          onNewNote={handleNewNote}
          onTogglePinNote={handleTogglePinNote}
          onDeleteAllNotes={handleDeleteAllNotes}
        />
        <SidebarInset className="overflow-hidden">
          <header className="flex h-12 shrink-0 items-center gap-2 bg-background">
            <div className="flex h-5 items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2"
              />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    {noteTitle}
                  </BreadcrumbItem> 
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>

          <div className="flex-1 overflow-hidden h-[calc(100%-3rem)]">
            {activeNoteId ? (
              <NoteClient
                key={activeNoteId}
                noteId={activeNoteId}
                initialNote={activeNoteId === initialNote?.id ? initialNote : undefined}
                onNoteActivity={handleNoteActivity}
              />
            ) : isLoading ? (
              <div className="flex-1 w-full h-full" />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
                <div className="flex items-center justify-center size-14 rounded-2xl bg-muted">
                  <NotebookPen className="size-7 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">No notes yet</h2>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Create your first note to start writing.
                  </p>
                </div>
                <Button onClick={handleNewNote} size="sm">
                  New note
                </Button>
              </div>
            )}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
