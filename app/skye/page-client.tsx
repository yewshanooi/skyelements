'use client';

import { useState } from "react";
import { SquarePen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge";
import { ChatClient } from "./chat-client";

export function PageClient({ userEmail, signout }: { userEmail: string, signout: () => Promise<void> }) {
  const [chatKey, setChatKey] = useState(0);

  const handleNewChat = () => {
    setChatKey(prev => prev + 1);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-8">

      <div className="flex flex-row items-center gap-4 w-full max-w-3xl">
        <h1 className="scroll-m-20 text-3xl font-semibold text-balance flex items-center gap-2">
          Skye
          <Badge variant="secondary">Beta</Badge>
        </h1>
        
        <Button variant="secondary" className="cursor-pointer ml-auto" onClick={handleNewChat}>
          <SquarePen /> New Chat
        </Button>

        <form action={signout}>
          <Button type="submit" className="cursor-pointer disabled:cursor-not-allowed">
              Sign Out
          </Button>
        </form>
      </div>

      <ChatClient key={chatKey} userEmail={userEmail} />

      {/* <div className="text-muted-foreground text-sm mt-4 max-w-3xl">
        <p>Skye can make mistakes, so double-check it</p>
      </div> */}

    </main>
  );
}
