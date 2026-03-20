'use client';

import { useState, useEffect, useCallback } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { ChatClient } from "./chat-client";
import { NoteClient } from "./note-client";
import { listChats, deleteChat, deleteAllChats, type Chat } from "./chat-actions";
import { listNotes, deleteNote, deleteAllNotes, createNote, type Note } from "./note-actions";
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

  const handleNewChat = () => {
    setActiveView({ type: 'chat', id: null });
    setChatTitle("New chat");
    setChatKey(prev => prev + 1);
  };

  const handleSelectChat = (chatId: string) => {
    const chat = chats.find(c => c.id === chatId);
    setActiveView({ type: 'chat', id: chatId });
    setChatTitle(chat?.title ?? "Chat");
  };

  const handleChatCreated = useCallback((chatId: string, title: string) => {
    setActiveView({ type: 'chat', id: chatId });
    setChatTitle(title);
    setChats(prev => {
      if (prev.some(c => c.id === chatId)) return prev;
      const now = new Date().toISOString();
      return [
        { id: chatId, title, model: '', user_id: '', created_at: now, updated_at: now } as Chat,
        ...prev,
      ];
    });
  }, []);

  const handleChatActivity = useCallback((chatId: string) => {
    setChats(prev => {
      const idx = prev.findIndex(c => c.id === chatId);
      if (idx <= 0) return prev;
      const chat = { ...prev[idx], updated_at: new Date().toISOString() };
      return [chat, ...prev.slice(0, idx), ...prev.slice(idx + 1)];
    });
  }, []);

  const handleDeleteChat = async (chatId: string) => {
    try {
      await deleteChat(chatId);
      setChats(prev => prev.filter(c => c.id !== chatId));
      if (activeView.type === 'chat' && activeView.id === chatId) {
        handleNewChat();
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  };

  const handleDeleteAllChats = async () => {
    try {
      await deleteAllChats();
      setChats([]);
      handleNewChat();
    } catch (error) {
      console.error('Failed to delete all chats:', error);
    }
  };

  // --- Note handlers ---

  const handleNewNote = async () => {
    try {
      const note = await createNote();
      const now = new Date().toISOString();
      setNotes(prev => [
        { id: note.id, title: note.title, content: '', user_id: '', created_at: now, updated_at: now } as Note,
        ...prev,
      ]);
      setActiveView({ type: 'note', id: note.id });
      setNoteTitle('New note');
      setNoteKey(prev => prev + 1);
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  const handleSelectNote = (noteId: string) => {
    if (activeView.type === 'note' && activeView.id === noteId) return;
    const note = notes.find(n => n.id === noteId);
    setActiveView({ type: 'note', id: noteId });
    setNoteTitle(note?.title || "New note");
    setNoteKey(prev => prev + 1);
  };

  const handleNoteCreated = useCallback((noteId: string, title: string) => {
    setActiveView({ type: 'note', id: noteId });
    setNoteTitle(title);
    setNotes(prev => {
      if (prev.some(n => n.id === noteId)) return prev;
      const now = new Date().toISOString();
      return [
        { id: noteId, title, content: '', user_id: '', created_at: now, updated_at: now } as Note,
        ...prev,
      ];
    });
  }, []);

  const handleNoteActivity = useCallback((noteId: string, title: string) => {
    setNotes(prev => {
      const idx = prev.findIndex(n => n.id === noteId);
      if (idx < 0) return prev;
      const note = { ...prev[idx], title, updated_at: new Date().toISOString() };
      return [note, ...prev.slice(0, idx), ...prev.slice(idx + 1)];
    });
    setNoteTitle(title || 'New note');
  }, []);

  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteNote(noteId);
      setNotes(prev => prev.filter(n => n.id !== noteId));
      if (activeView.type === 'note' && activeView.id === noteId) {
        handleNewChat();
      }
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const handleDeleteAllNotes = async () => {
    try {
      await deleteAllNotes();
      setNotes([]);
      if (activeView.type === 'note') {
        handleNewChat();
      }
    } catch (error) {
      console.error('Failed to delete all notes:', error);
    }
  };

  // --- Render ---

  const breadcrumbTitle = activeView.type === 'chat' ? chatTitle : noteTitle;

  return (
    <SidebarProvider>
      <AppSidebar
        user={user}
        signout={signout}
        onNewChat={handleNewChat}
        chats={chats}
        activeChatId={activeView.type === 'chat' ? activeView.id : null}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        onDeleteAllChats={handleDeleteAllChats}
        onDeleteAllNotes={handleDeleteAllNotes}
        notes={notes}
        activeNoteId={activeView.type === 'note' ? activeView.id : null}
        onSelectNote={handleSelectNote}
        onDeleteNote={handleDeleteNote}
        onNewNote={handleNewNote}
      />
      <SidebarInset className="overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-2 bg-background">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
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
