'use client';

import { useState, useEffect, useCallback } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { ChatClient } from "./chat-client";
import { listChats, deleteChat, type Chat } from "./chat-actions";
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
    // Refresh chat list
    listChats().then(setChats).catch(console.error);
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
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
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

        <main className="flex min-h-screen flex-col items-center justify-start p-8 pt-12 lg:pt-12">
          {!activeChatId && (
            <div className="flex flex-row items-center gap-4 w-full max-w-3xl mb-12">
              <h1 className="scroll-m-20 text-3xl font-semibold text-balance flex items-center gap-2">
                Greetings 👋
              </h1>
            </div>
          )}
          
          <ChatClient
            key={chatKey}
            chatId={activeChatId}
            onChatCreated={handleChatCreated}
          />

          <div className="text-muted-foreground text-xs mt-4 max-w-3xl">
            <p>Lithium is AI and can make mistakes.</p>
          </div>
        </main>

      </SidebarInset>
    </SidebarProvider>
  );
}
