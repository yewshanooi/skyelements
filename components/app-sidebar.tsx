"use client"

import * as React from "react"
import Image from "next/image"
import { Bot } from "lucide-react"

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
import type { Chat } from "@/app/lithium/actions"

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
    icon: Bot,
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
              />
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
