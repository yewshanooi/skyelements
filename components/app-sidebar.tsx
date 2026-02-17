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

const defaultChats = [
  {
    name: "Chat Title 1",
    url: "#",
    icon: MessagesSquare,
  },
  {
    name: "Chat Title 2",
    url: "#",
    icon: MessagesSquare,
  },
  {
    name: "Chat Title 3",
    url: "#",
    icon: MessagesSquare,
  },
]

export function AppSidebar({ user, signout, onNewChat, ...props }: React.ComponentProps<typeof Sidebar> & {
  user: {
    email: string
  }
  signout?: () => Promise<void>
  onNewChat?: () => void
}) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" onClick={onNewChat}>
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
        <NavChats chats={defaultChats} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} signout={signout} />
      </SidebarFooter>
    </Sidebar>
  )
}
