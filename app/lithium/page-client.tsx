'use client';

import { useState, useEffect, useCallback } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { ChatClient } from "./chat-client";
import { listChats, deleteChat, deleteAllChats, type Chat } from "./actions";
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

interface PageClientProps {
  user: {
    email: string;
  };
  signout?: () => Promise<void>;
}

export function PageClient({ user, signout }: PageClientProps) {
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatTitle, setChatTitle] = useState("New Chat");
  const [chats, setChats] = useState<Chat[]>([]);
  const [chatKey, setChatKey] = useState(0);

  // Load chats on mount
  useEffect(() => {
    listChats().then(setChats).catch(console.error);
  }, []);

  const handleNewChat = () => {
    setActiveChatId(null);
    setChatTitle("New Chat");
    setChatKey(prev => prev + 1);
  };

  const handleSelectChat = (chatId: string) => {
    const chat = chats.find(c => c.id === chatId);
    setActiveChatId(chatId);
    setChatTitle(chat?.title ?? "Chat");
    setChatKey(prev => prev + 1);
  };

  const handleChatCreated = useCallback((chatId: string, title: string) => {
    setActiveChatId(chatId);
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
      if (idx <= 0) return prev;               // already at top or not found
      const chat = { ...prev[idx], updated_at: new Date().toISOString() };
      return [chat, ...prev.slice(0, idx), ...prev.slice(idx + 1)];
    });
  }, []);

  const handleDeleteChat = async (chatId: string) => {
    try {
      await deleteChat(chatId);
      setChats(prev => prev.filter(c => c.id !== chatId));
      if (activeChatId === chatId) {
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

  return (
    <SidebarProvider>
      <AppSidebar
        user={user}
        signout={signout}
        onNewChat={handleNewChat}
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        onDeleteAllChats={handleDeleteAllChats}
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
                  {chatTitle}
                </BreadcrumbItem> 
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          <ChatClient
            key={chatKey}
            chatId={activeChatId}
            onChatCreated={handleChatCreated}
            onChatActivity={handleChatActivity}
          />
        </div>

      </SidebarInset>
    </SidebarProvider>
  );
}
