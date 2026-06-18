"use client"

import { useState } from "react"
import {
  Bot,
  MoreHorizontal,
  Trash2,
  Pin,
  PinOff,
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { buttonVariants } from "@/components/ui/button"

export function NavChats({
  chats,
  activeChatId,
  onSelectChat,
  onDeleteChat,
  onTogglePinChat,
}: {
  chats: {
    id: string
    name: string
    isPinned?: boolean
    updatedAt: string
  }[]
  activeChatId?: string | null
  onSelectChat?: (chatId: string) => void
  onDeleteChat?: (chatId: string) => void
  onTogglePinChat?: (chatId: string, currentPinStatus: boolean) => void | Promise<void>
}) {
  const { isMobile } = useSidebar()
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  if (chats.length === 0) {
    return (
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel>Chats</SidebarGroupLabel>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton disabled>
              <span className="text-muted-foreground text-xs">Your chats will show up here.</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    )
  }

  return (
    <>
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Chats</SidebarGroupLabel>
      <SidebarMenu>
        {chats.map((item) => (
          <SidebarMenuItem key={item.id}>
            <SidebarMenuButton
              isActive={activeChatId === item.id}
              onClick={() => onSelectChat?.(item.id)}
              className="cursor-pointer"
            >
              <Bot />
              <span>{item.name}</span>
            </SidebarMenuButton>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuAction showOnHover={!item.isPinned} className="group/action">
                  {item.isPinned ? (
                    <>
                      <Pin className="h-4 w-4 text-muted-foreground group-hover/menu-item:hidden group-data-[state=open]/action:hidden" />
                      <MoreHorizontal className="h-4 w-4 hidden group-hover/menu-item:block group-data-[state=open]/action:block" />
                    </>
                  ) : (
                    <MoreHorizontal />
                  )}
                  <span className="sr-only">More</span>
                </SidebarMenuAction>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-48"
                side={isMobile ? "bottom" : "right"}
                align={isMobile ? "end" : "start"}
              >
                <DropdownMenuItem
                  onClick={() => onTogglePinChat?.(item.id, item.isPinned || false)}
                >
                  {item.isPinned ? <PinOff /> : <Pin />}
                  <span>{item.isPinned ? 'Unpin' : 'Pin'}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setPendingDeleteId(item.id)}
                >
                  <Trash2 className="text-muted-foreground" />
                  <span>Delete</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Lithium is AI and can make mistakes.</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">{new Date(item.updatedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</DropdownMenuLabel>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>

    <AlertDialog
      open={pendingDeleteId !== null}
      onOpenChange={(open) => { if (!open) setPendingDeleteId(null) }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete chat?</AlertDialogTitle>
          <AlertDialogDescription>
            Once you delete a chat, it&apos;s gone forever.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              onDeleteChat?.(pendingDeleteId!)
              setPendingDeleteId(null)
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  )
}
