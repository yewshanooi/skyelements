'use client';

import { useState } from "react";
import { User, SquarePen, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge";
import { ChatClient } from "./chat-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"

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
          {/* <Badge variant="outline">Beta</Badge> */}
        </h1>
        
        <Button variant="secondary" className="cursor-pointer ml-auto" onClick={handleNewChat}>
          <SquarePen /> New Chat
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="default" size="icon" className="cursor-pointer">
              <User />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent side="bottom" align="end">
            <DropdownMenuLabel>{userEmail}</DropdownMenuLabel>

            {/* <DropdownMenuItem
              onClick={() => handleNewChat()}
              className="cursor-pointer"
            >
              <SquarePen/> New Chat
            </DropdownMenuItem> */}

            <DropdownMenuItem 
              variant="destructive" 
              onClick={() => signout()} 
              className="cursor-pointer"
            >
              <LogOut/> Logout
            </DropdownMenuItem>

          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ChatClient key={chatKey} />

      <div className="text-muted-foreground text-xs mt-4 max-w-3xl">
        <p>Skye can make mistakes, so double-check it</p>
      </div>

    </main>
  );
}
