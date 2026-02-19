"use client"

import * as React from "react"
import {
  Bot,
  MessagesSquare,
} from "lucide-react"

import { NavChats } from "@/components/nav-chats"
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
import type { Chat } from "@/app/skye/chat-actions"

export function AppSidebar({ user, signout, onNewChat, chats, activeChatId, onSelectChat, onDeleteChat, ...props }: React.ComponentProps<typeof Sidebar> & {
  user: {
    email: string
  }
  signout?: () => Promise<void>
  onNewChat?: () => void
  chats?: Chat[]
  activeChatId?: string | null
  onSelectChat?: (chatId: string) => void
  onDeleteChat?: (chatId: string) => void
}) {
  const chatItems = (chats ?? []).map(chat => ({
    id: chat.id,
    name: chat.title,
    icon: MessagesSquare,
  }));

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" onClick={onNewChat} className="cursor-pointer">
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <Bot className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">Skye</span>
                <span className="truncate text-xs">by SkyElements</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavChats
          chats={chatItems}
          activeChatId={activeChatId}
          onSelectChat={onSelectChat}
          onDeleteChat={onDeleteChat}
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} signout={signout} />
      </SidebarFooter>
    </Sidebar>
  )
}
