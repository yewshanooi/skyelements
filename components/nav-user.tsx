"use client"

import { useState } from "react"
import { ChevronsUpDown } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { SettingsDialog } from "@/components/settings-dialog"
import type { UserProfile } from "@/app/lithium/profile"

export function NavUser({
  user,
  signout,
  onDeleteAllChats,
  onDeleteAllNotes,
  onProfileUpdated,
}: {
  user: UserProfile
  signout?: () => Promise<void>
  onDeleteAllChats?: () => Promise<void>
  onDeleteAllNotes?: () => Promise<void>
  onProfileUpdated?: (profile: UserProfile) => void
}) {
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            onClick={() => setSettingsOpen(true)}
          >
            <Avatar className="h-8 w-8 rounded-lg">
              {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="Your avatar" />}
              <AvatarFallback className="rounded-lg">
                {(user.displayName || user.email).slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.displayName || "User"}</span>
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
        onProfileUpdated={onProfileUpdated}
      />
    </>
  )
}
