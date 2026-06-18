'use client';

import { useState, useEffect, useCallback } from "react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sortByPinned<T extends { is_pinned: boolean; updated_at: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
}

import { AppSidebar } from "@/components/app-sidebar";
import { ChatClient } from "./chat-client";
import { NoteClient } from "./note-client";
import { listChats, deleteChat, deleteAllChats, togglePinChat, type Chat } from "./chat-actions";
import { listNotes, deleteNote, deleteAllNotes, createNote, togglePinNote, type Note } from "./note-actions";
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

type ActiveView = { type: 'chat'; id: string | null } | { type: 'note'; id: string | null };

interface PageClientProps {
  user: {
    email: string;
  };
  signout?: () => Promise<void>;
}

export function PageClient({ user, signout }: PageClientProps) {
  const [activeView, setActiveView] = useState<ActiveView>({ type: 'chat', id: null });
  const [chatTitle, setChatTitle] = useState("New chat");
  const [noteTitle, setNoteTitle] = useState("New note");
  const [chats, setChats] = useState<Chat[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [chatKey, setChatKey] = useState(0);
  const [noteKey, setNoteKey] = useState(0);

  // Load chats and notes on mount
  useEffect(() => {
    listChats().then(setChats).catch(console.error);
    listNotes().then(setNotes).catch(console.error);
  }, []);

  // --- Chat handlers ---

  const handleNewChat = useCallback(() => {
    setActiveView({ type: 'chat', id: null });
    setChatTitle("New chat");
    setChatKey(prev => prev + 1);
  }, []);

  const handleSelectChat = useCallback((chatId: string) => {
    const chat = chats.find(c => c.id === chatId);
    setActiveView({ type: 'chat', id: chatId });
    setChatTitle(chat?.title ?? "Chat");
  }, [chats]);

  const handleChatCreated = useCallback((chatId: string, title: string) => {
    setActiveView({ type: 'chat', id: chatId });
    setChatTitle(title);
    setChats(prev => {
      if (prev.some(c => c.id === chatId)) return prev;
      const now = new Date().toISOString();
      return sortByPinned([
        { id: chatId, title, model: '', user_id: '', is_pinned: false, created_at: now, updated_at: now } as Chat,
        ...prev,
      ]);
    });
  }, []);

  const handleChatActivity = useCallback((chatId: string) => {
    setChats(prev => sortByPinned(
      prev.map(c => c.id === chatId ? { ...c, updated_at: new Date().toISOString() } : c)
    ));
  }, []);

  const handleTogglePinChat = useCallback(async (chatId: string, currentPinStatus: boolean) => {
    const newPinStatus = !currentPinStatus;
    // Optimistic update — flip pin state immediately without touching updated_at
    setChats(prev => sortByPinned(prev.map(c => c.id === chatId ? { ...c, is_pinned: newPinStatus } : c)));
    try {
      await togglePinChat(chatId, newPinStatus);
    } catch (error) {
      console.error('Failed to toggle pin on chat:', error);
      // Roll back on failure
      setChats(prev => sortByPinned(prev.map(c => c.id === chatId ? { ...c, is_pinned: currentPinStatus } : c)));
    }
  }, []);

  const handleDeleteChat = useCallback(async (chatId: string) => {
    try {
      await deleteChat(chatId);
      setChats(prev => prev.filter(c => c.id !== chatId));
      setActiveView(prev => {
        if (prev.type === 'chat' && prev.id === chatId) {
          setChatTitle("New chat");
          setChatKey(k => k + 1);
          return { type: 'chat', id: null };
        }
        return prev;
      });
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  }, []);

  const handleDeleteAllChats = useCallback(async () => {
    try {
      await deleteAllChats();
      setChats([]);
      setActiveView({ type: 'chat', id: null });
      setChatTitle("New chat");
      setChatKey(prev => prev + 1);
    } catch (error) {
      console.error('Failed to delete all chats:', error);
    }
  }, []);

  // --- Note handlers ---

  const handleNewNote = useCallback(async () => {
    try {
      const note = await createNote();
      const now = new Date().toISOString();
      setNotes(prev => sortByPinned([
        { id: note.id, title: note.title, content: '', user_id: '', is_pinned: false, created_at: now, updated_at: now } as Note,
        ...prev,
      ]));
      setActiveView({ type: 'note', id: note.id });
      setNoteTitle('New note');
      setNoteKey(prev => prev + 1);
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  }, []);

  const handleSelectNote = useCallback((noteId: string) => {
    setActiveView(prev => {
      if (prev.type === 'note' && prev.id === noteId) return prev;
      setNoteKey(k => k + 1);
      return { type: 'note', id: noteId };
    });
    setNotes(prev => {
      const note = prev.find(n => n.id === noteId);
      setNoteTitle(note?.title || "New note");
      return prev;
    });
  }, []);

  const handleNoteCreated = useCallback((noteId: string, title: string) => {
    setActiveView({ type: 'note', id: noteId });
    setNoteTitle(title);
    setNotes(prev => {
      if (prev.some(n => n.id === noteId)) return prev;
      const now = new Date().toISOString();
      return sortByPinned([
        { id: noteId, title, content: '', user_id: '', is_pinned: false, created_at: now, updated_at: now } as Note,
        ...prev,
      ]);
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
      await deleteNote(noteId);
      setNotes(prev => prev.filter(n => n.id !== noteId));
      setActiveView(prev => {
        if (prev.type === 'note' && prev.id === noteId) {
          setChatTitle("New chat");
          setChatKey(k => k + 1);
          return { type: 'chat', id: null };
        }
        return prev;
      });
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  }, []);

  const handleDeleteAllNotes = useCallback(async () => {
    try {
      await deleteAllNotes();
      setNotes([]);
      setActiveView(prev => {
        if (prev.type === 'note') {
          setChatTitle("New chat");
          setChatKey(k => k + 1);
          return { type: 'chat', id: null };
        }
        return prev;
      });
    } catch (error) {
      console.error('Failed to delete all notes:', error);
    }
  }, []);

  // --- Render ---

  const breadcrumbTitle = activeView.type === 'chat' ? chatTitle : noteTitle;

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <AppSidebar
        user={user}
        signout={signout}
        onNewChat={handleNewChat}
        chats={chats}
        activeChatId={activeView.type === 'chat' ? activeView.id : null}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        onTogglePinChat={handleTogglePinChat}
        onDeleteAllChats={handleDeleteAllChats}
        onDeleteAllNotes={handleDeleteAllNotes}
        notes={notes}
        activeNoteId={activeView.type === 'note' ? activeView.id : null}
        onSelectNote={handleSelectNote}
        onDeleteNote={handleDeleteNote}
        onNewNote={handleNewNote}
        onTogglePinNote={handleTogglePinNote}
      />
      <SidebarInset className="overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-2 bg-background">
          <div className="flex h-5 items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  {breadcrumbTitle}
                </BreadcrumbItem> 
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          {activeView.type === 'chat' ? (
            <ChatClient
              key={chatKey}
              chatId={activeView.id}
              onChatCreated={handleChatCreated}
              onChatActivity={handleChatActivity}
            />
          ) : (
            <NoteClient
              key={noteKey}
              noteId={activeView.id}
              onNoteCreated={handleNoteCreated}
              onNoteActivity={handleNoteActivity}
            />
          )}
        </div>

      </SidebarInset>
    </SidebarProvider>
  );
}

