"use client"

import * as React from "react"
import Image from "next/image"
import { Bot } from "lucide-react"

import { NavChats } from "@/components/nav-chats"
import { NavNotes } from "@/components/nav-notes"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import type { Chat } from "@/app/lithium/actions"
import type { Note } from "@/app/lithium/note-actions"

export function AppSidebar({ user, signout, onNewChat, chats, activeChatId, onSelectChat, onDeleteChat, onDeleteAllChats, onDeleteAllNotes, notes, activeNoteId, onSelectNote, onDeleteNote, onNewNote, ...props }: React.ComponentProps<typeof Sidebar> & {
  user: {
    email: string
  }
  signout?: () => Promise<void>
  onNewChat?: () => void
  chats?: Chat[]
  activeChatId?: string | null
  onSelectChat?: (chatId: string) => void
  onDeleteChat?: (chatId: string) => void
  onDeleteAllChats?: () => Promise<void>
  onDeleteAllNotes?: () => Promise<void>
  notes?: Note[]
  activeNoteId?: string | null
  onSelectNote?: (noteId: string) => void
  onDeleteNote?: (noteId: string) => void
  onNewNote?: () => void
}) {
  const chatItems = (chats ?? []).map(chat => ({
    id: chat.id,
    name: chat.title,
    icon: Bot,
    updatedAt: chat.updated_at,
  }));

  const noteItems = (notes ?? []).map(note => ({
    id: note.id,
    name: note.title || 'New note',
    updatedAt: note.updated_at,
  }));

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" onClick={onNewChat} className="cursor-pointer">
              <Image 
                src="/logo/lithium.png" 
                alt="Lithium Logo" 
                width={165} 
                height={55}
                className="h-9 w-auto"
                priority
              />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavNotes
          notes={noteItems}
          activeNoteId={activeNoteId}
          onSelectNote={onSelectNote}
          onDeleteNote={onDeleteNote}
          onNewNote={onNewNote}
        />
        <NavChats
          chats={chatItems}
          activeChatId={activeChatId}
          onSelectChat={onSelectChat}
          onDeleteChat={onDeleteChat}
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} signout={signout} onDeleteAllChats={onDeleteAllChats} onDeleteAllNotes={onDeleteAllNotes} />
      </SidebarFooter>
    </Sidebar>
  )
}
