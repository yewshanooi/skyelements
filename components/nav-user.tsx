"use client"

import { useState } from "react"
import { ChevronsUpDown, Settings } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { SettingsDialog } from "@/components/settings-dialog"

export function NavUser({
  user,
  signout,
  onDeleteAllChats,
  onDeleteAllNotes,
}: {
  user: {
    email: string
  }
  signout?: () => Promise<void>
  onDeleteAllChats?: () => Promise<void>
  onDeleteAllNotes?: () => Promise<void>
}) {
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            onClick={() => setSettingsOpen(true)}
            className="cursor-pointer"
          >
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarFallback className="rounded-lg">
                <Settings className="size-4" />
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">Settings</span>
            </div>
            <ChevronsUpDown className="ml-auto size-4" />
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        user={user}
        signout={signout}
        onDeleteAllChats={onDeleteAllChats}
        onDeleteAllNotes={onDeleteAllNotes}
      />
    </>
  )
}
