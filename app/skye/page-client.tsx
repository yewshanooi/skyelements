'use client';

import { useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { ChatClient } from "./chat-client";
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
  const [chatKey, setChatKey] = useState(0);

  const handleNewChat = () => {
    setChatKey(prev => prev + 1);
  };

  return (
    <SidebarProvider>
      <AppSidebar user={user} signout={signout} onNewChat={handleNewChat} />
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
                  New Chat
                </BreadcrumbItem> 
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <main className="flex min-h-screen flex-col items-center justify-start p-8 pt-16 lg:pt-24">
          <div className="flex flex-row items-center gap-4 w-full max-w-3xl">
            <h1 className="scroll-m-20 text-3xl font-semibold text-balance flex items-center gap-2">
              Skye
            </h1>
          </div>

          <ChatClient key={chatKey} />

          <div className="text-muted-foreground text-xs mt-4 max-w-3xl">
            <p>Skye is AI and can make mistakes.</p>
          </div>
        </main>

      </SidebarInset>
    </SidebarProvider>
  );
}
